import contextlib
import copy
import io
import json
import unittest
from pathlib import Path
from unittest.mock import patch

from agent.workflow import fraud_agent
from tools.tigergraph_client import TigerGraphClientError


FIXTURE = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())
TRANSACTION = {
    "found": True, "transaction_id": "3514030", "customer_id": "C12382",
    "amount": "77.07", "risk_score": "0.61", "channel": "in_person",
}
CASE = {"case_id": "HHG-001", "flagged_txn_id": "3514030", "card_id": "C12382-K1"}


class WorkflowTests(unittest.TestCase):
    def invoke(self, query_effect):
        with patch.dict("os.environ", {
            "TIGERGRAPH_BASE_URL": "https://test.invalid", "TIGERGRAPH_TOKEN": "unit-test-token",
        }, clear=True), patch("tools.tigergraph_client.TigerGraphClient.run_query", side_effect=query_effect), \
                patch("agent.workflow.get_transaction", return_value=copy.deepcopy(TRANSACTION)), \
                contextlib.redirect_stdout(io.StringIO()):
            return fraud_agent.invoke(CASE)

    def test_full_workflow_preserves_live_fixture_and_existing_policy_behavior(self):
        result = self.invoke(lambda name, txn: copy.deepcopy(FIXTURE[name]))
        self.assertEqual(result["graph_query_status"], "complete")
        self.assertEqual(result["graph_pattern_assessment"]["total_related_amount"], 48706.58)
        self.assertEqual(result["graph_velocity"]["within_1h"], 0)
        self.assertEqual(result["graph_velocity"]["amount_6h"], 315.89)
        self.assertEqual(result["graph_fraud_pattern_signals"]["small_online_count"], 0)
        self.assertEqual(len(result["graph_query_provenance"]), 4)
        self.assertEqual(len(result["related_txn_ids"]), 421)
        self.assertEqual(result["affected_txn_ids"], [])
        self.assertEqual(result["connected_card_ids"], ["21139"])
        self.assertEqual(result["card_id"], "C12382-K1")
        self.assertEqual(result["exposure_usd"], 77.07)
        self.assertEqual(result["fraud_probability"], 0.61)
        self.assertEqual(result["verdict"], "medium_risk")
        self.assertFalse(result["card_testing"])
        self.assertFalse(result["shared_region"])
        self.assertFalse(result["shared_device"])
        self.assertFalse(result["file_report"])
        self.assertEqual(result["customer_response"], "UNKNOWN")
        for stage in ("initial_actions", "final_actions"):
            self.assertEqual([(a["action"], a["route"]) for a in result[stage]], [("CREATE_CASE", "auto")])
        evidence = {item["type"]: item["data"] for item in result["evidence"]}
        self.assertEqual(evidence["transaction"], TRANSACTION)
        self.assertEqual(evidence["graph"]["raw_query_results"], FIXTURE)

    def test_partial_graph_does_not_fail_workflow(self):
        def run(name, txn):
            if name == "risk_pattern_summary":
                raise TigerGraphClientError("timeout", "TigerGraph request timed out.")
            return copy.deepcopy(FIXTURE[name])
        result = self.invoke(run)
        self.assertEqual(result["graph_query_status"], "partial")
        self.assertEqual(result["graph_pattern_assessment"], {})
        self.assertEqual(result["graph_velocity"]["within_6h"], 3)
        self.assertEqual(result["exposure_usd"], 77.07)

    def test_unavailable_graph_does_not_fail_workflow(self):
        result = self.invoke(TigerGraphClientError("network", "Unable to reach TigerGraph."))
        self.assertEqual(result["graph_query_status"], "unavailable")
        self.assertEqual(result["graph_velocity"], {})
        self.assertEqual(result["related_txn_ids"], [])
        self.assertEqual(result["exposure_usd"], 77.07)
        self.assertEqual(result["summary"], "CREATE_CASE")
