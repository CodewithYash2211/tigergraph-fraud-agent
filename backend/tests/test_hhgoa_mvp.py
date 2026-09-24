import contextlib
import copy
import csv
import io
import json
import unittest
from pathlib import Path
from unittest.mock import Mock, patch

from fastapi.testclient import TestClient

from agent.workflow import fraud_agent
from benchmarks.run_cases import run_cases
from main import app
from tests.workspace import output_directory
from tools.assessment import assess
from tools.cases import find_similar_cases
from tools.grounding import build_context
from tools.triggers import InvestigationError, load_trigger, trigger_response
from tools.transaction import get_transactions, get_transaction


FIXTURE = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())
TXN = {"found": True, "transaction_id": "3514030", "amount": "77.07",
       "customer_id": "C12382", "risk_score": "0.61", "channel": "in_person"}


def invoke(output, case_id="HHG-001", txn=None, graph=None):
    transaction = copy.deepcopy(TXN if txn is None else txn)
    with patch("agent.workflow.get_transaction", return_value=transaction), \
            patch("agent.workflow.get_connected_entities", return_value=graph) as graph_call, \
            patch("tools.artifacts.write_graph_case", return_value={"status": "failed", "reason": "test failure"}), \
            contextlib.redirect_stdout(io.StringIO()):
        result = fraud_agent.invoke({"case_id": case_id, "case_output_dir": str(output),
                                     "graph_mode": "offline" if graph is None else "live"})
    return result, graph_call


def evidence_state(graph=None, history=None):
    return {"customer_id": "C12382", "customer_response": "UNKNOWN", "trigger": {}, "evidence": [
        {"type": "transaction", "data": copy.deepcopy(TXN)},
        {"type": "graph", "data": graph or {"status": "unavailable"}},
        {"type": "historical_cases", "data": history or {"status": "complete", "similar_cases": []}},
    ]}


class TriggerTests(unittest.TestCase):
    def test_load_preserves_all_case_fields(self):
        trigger = load_trigger("HHG-001", "3514030")
        self.assertEqual(trigger["risk_score"], "0.61")
        self.assertEqual(trigger["card_id"], "C12382-K1")
        self.assertEqual(trigger["trigger_type"], "risk_score")
        self.assertTrue(trigger["trigger_text"])

    def test_customer_denial_is_supplied_not_simulated(self):
        self.assertEqual(trigger_response(load_trigger("HHG-003")), "DENIED")
        self.assertEqual(trigger_response(load_trigger("HHG-014")), "UNKNOWN")

    def test_bad_id_mismatch_and_missing_case(self):
        for case_id, txn in (("../escape", None), ("HHG-001", "wrong"), ("HHG-999", None)):
            with self.subTest(case_id=case_id), self.assertRaises(InvestigationError):
                load_trigger(case_id, txn)

    def test_missing_transaction_fails_before_graph_and_persistence(self):
        with output_directory() as output, patch("agent.workflow.get_transaction", return_value={"found": False}), \
                patch("agent.workflow.get_connected_entities") as graph, contextlib.redirect_stdout(io.StringIO()):
            with self.assertRaises(InvestigationError) as error:
                fraud_agent.invoke({"case_id": "HHG-001", "case_output_dir": str(output)})
            self.assertEqual(error.exception.code, "transaction_not_found")
            graph.assert_not_called()
            self.assertEqual(list(output.iterdir()), [])

    def test_invalid_amount_is_controlled(self):
        with output_directory() as output, self.assertRaises(InvestigationError):
            invoke(output, txn={**TXN, "amount": "NaN"})


class HistoryTests(unittest.TestCase):
    def test_prior_matching_excludes_future_and_unrelated(self):
        with output_directory() as output:
            path = output / "history.csv"
            fields = ["case_id", "customer_id", "card_id", "txn_ids", "closed_at", "pattern", "outcome"]
            with path.open("w", newline="") as handle:
                writer = csv.DictWriter(handle, fieldnames=fields)
                writer.writeheader()
                for row in [
                    ["prior", "C", "card", "other|T", "2016-01-01 00:00:00", "card_testing", "confirmed_fraud"],
                    ["future", "C", "card", "T", "2018-01-01 00:00:00", "card_testing", "confirmed_fraud"],
                    ["unrelated", "X", "x", "x", "2016-01-01 00:00:00", "card_testing", "confirmed_fraud"],
                ]:
                    writer.writerow(dict(zip(fields, row)))
            result = find_similar_cases("T", customer_id="C", card_id="card", as_of="2017-01-01", path=path)
            self.assertEqual([c["case_id"] for c in result["similar_cases"]], ["prior"])
            self.assertEqual(result["similar_cases"][0]["match_reasons"], ["same_transaction", "same_card", "same_customer"])

    def test_missing_time_does_not_use_future_history(self):
        self.assertEqual(find_similar_cases("T")["status"], "unavailable")

    def test_missing_history_is_graceful(self):
        with output_directory() as output:
            self.assertEqual(find_similar_cases("T", as_of="2017-01-01", path=output / "missing.csv")["status"], "unavailable")


class AssessmentTests(unittest.TestCase):
    def test_empty_containers_do_not_count_as_signals(self):
        result = assess(evidence_state())
        self.assertEqual(result["evidence_count"], 1)
        self.assertFalse(result["uncertainty"]["sufficient"])
        self.assertEqual(result["pattern"], "UNKNOWN")

    def test_graph_and_history_support_sufficiency_without_probability_inflation(self):
        graph = {"status": "complete", "related_transactions": ["other"],
                 "pattern_assessment": {"high_risk_count": 5, "total_related_amount": 48706.58},
                 "fraud_pattern_signals": {"high_risk_count": 5}, "velocity": {"within_1h": 0}}
        result = assess(evidence_state(graph))
        self.assertEqual(result["evidence_count"], 2)
        self.assertTrue(result["uncertainty"]["sufficient"])
        self.assertEqual(result["fraud_probability"], .61)
        self.assertEqual(result["pattern"], "UNKNOWN")

    def test_inconsistent_graph_values_are_explicit(self):
        graph = {"status": "complete", "pattern_assessment": {"high_risk_count": 5},
                 "fraud_pattern_signals": {"high_risk_count": 1}}
        result = assess(evidence_state(graph))
        self.assertTrue(result["uncertainty"]["conflicting_evidence"])
        self.assertFalse(result["uncertainty"]["sufficient"])
        self.assertEqual(result["verdict"], "uncertain")

    def test_denial_and_online_channel_support_documented_hypothesis(self):
        state = evidence_state()
        state["customer_response"] = "DENIED"
        state["evidence"][0]["data"]["channel"] = "online"
        self.assertEqual(assess(state)["pattern"], "CARD_NOT_PRESENT_FRAUD")

    def test_graphrag_has_separate_grounded_sources_and_is_used(self):
        state = evidence_state({"status": "partial", "velocity": {"within_6h": 3},
                                "query_provenance": {"transaction_velocity": {"status": "complete"}}})
        context = build_context(state)
        self.assertEqual(context["graph_evidence"]["velocity"]["within_6h"], 3)
        self.assertIn("R5", context["policy_evidence"]["implementation"])
        self.assertTrue(context["pattern_evidence"]["documentation"]["patterns"])
        self.assertEqual(context["historical_case_evidence"]["source"], "data/closed_cases_history.csv")
        self.assertIn("Complete TigerGraph evidence", context["uncertainty"]["missing_evidence"])
        with patch("tools.assessment.build_context", return_value=context) as builder:
            assessed = assess(state)
        builder.assert_called_once_with(state)
        self.assertEqual(assessed["grounded_context"]["graph_evidence"]["velocity"]["within_6h"], 3)


class LifecycleTests(unittest.TestCase):
    def test_bounded_loop_and_local_persistence(self):
        with output_directory() as output, patch("tools.graph_persistence.TigerGraphClient") as client:
            result, graph = invoke(output)
            self.assertEqual(result["iteration"], 2)
            self.assertEqual(len(result["evidence_requests"]), 1)
            self.assertTrue(result["evidence_requests"][0]["simulated"])
            self.assertEqual(result["customer_response"], "UNKNOWN")
            self.assertEqual(result["graph_persistence"]["status"], "not_attempted")
            graph.assert_not_called()
            client.assert_not_called()
            saved = json.loads((output / "HHG-001.json").read_text())
            for key in ("trigger", "transaction", "graph_evidence", "historical_evidence", "assessment", "uncertainty",
                        "evidence_requests", "initial_actions", "final_actions", "approval_routes", "case_status",
                        "created_at", "updated_at", "grounded_context", "graph_persistence"):
                self.assertIn(key, saved)
            self.assertEqual(saved["transaction"], TXN)
            self.assertFalse(saved["actions_executed"])

    def test_sufficient_evidence_stops_after_first_assessment(self):
        graph = {"status": "complete", "related_transactions": ["other"], "pattern_assessment": {"high_risk_count": 5}}
        with output_directory() as output:
            result, _ = invoke(output, graph=graph)
            self.assertEqual(result["iteration"], 1)
            self.assertEqual(result["evidence_requests"], [])
            self.assertEqual(result["graph_persistence"]["status"], "failed")
            self.assertTrue((output / "HHG-001.json").exists())
            self.assertEqual(json.loads((output / "HHG-001.json").read_text())["graph_persistence"]["status"], "failed")

    def test_sar_is_a_draft_only_when_policy_requires(self):
        txn = {**TXN, "transaction_id": "3506725", "customer_id": load_trigger("HHG-010")["customer_id"],
               "amount": "1000.03", "risk_score": ".90", "channel": "online"}
        with output_directory() as output:
            result, _ = invoke(output, "HHG-010", txn=txn)
            self.assertTrue(result["file_report"])
            draft = json.loads((output / "sar/HHG-010.json").read_text())
            self.assertEqual(draft["status"], "DRAFT")
            self.assertFalse(draft["externally_filed"])
            self.assertEqual(draft["approval_route"], "L2")
            self.assertEqual(draft["exposure_usd"], 1000.03)

    def test_repeat_run_preserves_created_timestamp(self):
        with output_directory() as output:
            invoke(output)
            first = json.loads((output / "HHG-001.json").read_text())
            invoke(output)
            second = json.loads((output / "HHG-001.json").read_text())
            self.assertEqual(first["created_at"], second["created_at"])
            self.assertGreaterEqual(second["updated_at"], first["updated_at"])

    def test_no_sar_file_when_policy_does_not_require_one(self):
        with output_directory() as output:
            result, _ = invoke(output)
            self.assertFalse(result["file_report"])
            self.assertFalse((output / "sar/HHG-001.json").exists())


class TransactionBatchTests(unittest.TestCase):
    def test_batch_and_single_lookup_have_identical_csv_evidence(self):
        with output_directory() as output:
            path = output / "transactions.csv"
            path.write_text("TransactionID,TransactionAmt,customer_id,risk_score\n1,12.5,C,.61\n2,17,C,.2\n")
            with patch("tools.transaction.DATA_PATH", str(path)):
                batch = get_transactions(["1", "missing"])
                self.assertEqual(batch["1"], get_transaction("1"))
                self.assertNotIn("missing", batch)
                self.assertFalse(get_transaction("missing")["found"])

    def test_empty_batch_never_opens_dataset(self):
        with patch("builtins.open") as handle:
            self.assertEqual(get_transactions([]), {})
            handle.assert_not_called()


class ApiTests(unittest.TestCase):
    def test_missing_transaction_returns_controlled_404(self):
        with patch("agent.workflow.get_transaction", return_value={"found": False}), \
                patch("agent.workflow.get_connected_entities") as graph, contextlib.redirect_stdout(io.StringIO()):
            response = TestClient(app).post("/investigate", json={"case_id": "HHG-001", "flagged_txn_id": "3514030"})
        self.assertEqual(response.status_code, 404)
        self.assertEqual(response.json()["detail"]["code"], "transaction_not_found")
        graph.assert_not_called()

    def test_success_contract_is_preserved(self):
        with patch("main.fraud_agent.invoke", return_value={"case_id": "HHG-001"}):
            response = TestClient(app).post("/investigate", json={"case_id": "HHG-001", "flagged_txn_id": "3514030"})
        self.assertEqual(response.json(), {"status": "success", "result": {"case_id": "HHG-001"}})

    def test_unexpected_error_is_sanitized(self):
        with patch("main.fraud_agent.invoke", side_effect=RuntimeError("do-not-expose")):
            response = TestClient(app).post("/investigate", json={"case_id": "HHG-001", "flagged_txn_id": "3514030"})
        self.assertEqual(response.status_code, 500)
        self.assertNotIn("do-not-expose", response.text)


class BenchmarkTests(unittest.TestCase):
    def test_runner_isolates_failure_and_writes_both_outputs(self):
        agent = Mock()
        agent.invoke.side_effect = [InvestigationError("transaction_not_found", "Not found", 404), {
            "final_actions": [{"action": "CREATE_CASE", "route": "auto"}], "fraud_probability": .61,
            "verdict": "medium_risk", "pattern": "UNKNOWN", "uncertainty": {"sufficient": False},
            "case_status": "NEEDS_EVIDENCE", "file_report": False, "graph_query_status": "unavailable",
            "graph_persistence": {"status": "failed", "error": {"code": "missing_record_attribute", "message": "No compatible STRING attribute."}},
        }]
        with output_directory() as output:
            pack = output / "pack.csv"
            pack.write_text("case_id,flagged_txn_id,risk_score\nA,1,.6\nB,2,.61\n")
            report = run_cases(case_pack=pack, output_dir=output, offline=True, agent=agent, transactions={})
            self.assertEqual(report["total"], 2)
            self.assertEqual(report["completed"], 1)
            self.assertEqual(report["failed"], 1)
            self.assertEqual(report["mode"], "offline")
            self.assertEqual(agent.invoke.call_count, 2)
            self.assertTrue((output / "benchmark_results.json").exists())
            with (output / "benchmark_summary.csv").open(newline="") as handle:
                rows = list(csv.DictReader(handle))
            self.assertEqual(len(rows), 2)
            self.assertIn("uncertainty", rows[1])
            self.assertIsNone(report["results"][1]["error"])
            self.assertEqual(report["results"][1]["graph_persistence_error"]["code"], "missing_record_attribute")
            self.assertIn("missing_record_attribute", rows[1]["graph_persistence_error"])

    def test_batch_lookup_failure_is_recorded_for_every_case(self):
        with output_directory() as output, patch("benchmarks.run_cases.get_transactions", side_effect=OSError()):
            pack = output / "pack.csv"
            pack.write_text("case_id,flagged_txn_id\nA,1\nB,2\n")
            report = run_cases(case_pack=pack, output_dir=output, offline=True)
            self.assertEqual(report["failed"], 2)
            self.assertEqual(report["results"][0]["error"]["code"], "transaction_data_unavailable")
