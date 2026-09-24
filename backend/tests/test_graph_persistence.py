import json
import unittest
from pathlib import Path
from requests import Response
from requests.exceptions import HTTPError, Timeout
from unittest.mock import Mock

from tools.graph_persistence import write_graph_case


def record():
    return {"case_id": "HHG-001", "transaction": {"transaction_id": "3514030"},
            "trigger": {"customer_id": "C12382", "card_id": "C12382-K1"},
            "graph_evidence": {"connected_cards": ["21139"]}, "case_status": "NEEDS_EVIDENCE",
            "verdict": "medium_risk", "assessment": {"model_risk_score": .61, "pattern": "UNKNOWN", "prior_case_ids": []},
            "final_actions": [{"action": "CREATE_CASE", "route": "auto"}], "summary": "Evidence summary",
            "uncertainty": {"sufficient": False}, "updated_at": "2026-09-24T00:00:00+00:00"}


def connection():
    sdk = Mock()
    # Synthetic schema contract for unit tests, not a claimed production schema.
    sdk.getSchema.return_value = {"VertexTypes": [{"Name": "ClosedCase",
        "PrimaryId": {"AttributeType": {"Name": "STRING"}}, "Attributes": [
            {"AttributeName": "analyst_notes", "AttributeType": {"Name": "STRING"}},
            {"AttributeName": "case_id", "AttributeType": {"Name": "STRING"}},
            {"AttributeName": "risk_score", "AttributeType": {"Name": "DOUBLE"}},
        ]}]}
    sdk.upsertVertex.return_value = 1
    return sdk


class GraphPersistenceTests(unittest.TestCase):
    def test_inspected_schema_upsert_preserves_all_essential_facts(self):
        sdk = connection()
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "success")
        sdk.getSchema.assert_called_once_with(udts=False)
        vertex, case_id, attrs = sdk.upsertVertex.call_args.args
        self.assertEqual((vertex, case_id), ("ClosedCase", "HHG-001"))
        self.assertEqual(set(attrs), {"analyst_notes", "case_id", "risk_score"})
        notes = json.loads(attrs["analyst_notes"])
        for key in ("case_id", "customer_id", "card_id", "flagged_txn_id", "status", "verdict",
                    "risk_score", "pattern", "recommended_actions", "evidence_summary"):
            self.assertIn(key, notes)
        self.assertEqual(notes["graph_card_ids"], ["21139"])
        self.assertEqual(notes["card_id"], "C12382-K1")
        self.assertEqual(len(result["payload_sha256"]), 64)
        sdk.gsql.assert_not_called()

    def test_missing_schema_does_not_write_or_create_schema(self):
        sdk = connection()
        sdk.getSchema.return_value = {"VertexTypes": []}
        self.assertEqual(write_graph_case(record(), connection=sdk)["status"], "failed")
        sdk.upsertVertex.assert_not_called()
        sdk.gsql.assert_not_called()

    def test_no_suitable_text_field_does_not_write(self):
        sdk = connection()
        sdk.getSchema.return_value["VertexTypes"][0]["Attributes"] = []
        self.assertEqual(write_graph_case(record(), connection=sdk)["status"], "failed")
        sdk.upsertVertex.assert_not_called()

    def test_write_exception_is_uncertain_and_sanitized(self):
        sdk = connection()
        sdk.upsertVertex.side_effect = RuntimeError("do-not-expose")
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "uncertain")
        self.assertNotIn("do-not-expose", json.dumps(result))

    def test_schema_exception_is_failed_and_sanitized(self):
        sdk = connection()
        sdk.getSchema.side_effect = RuntimeError("do-not-expose")
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "failed")
        self.assertNotIn("do-not-expose", json.dumps(result))

    def test_rejected_upsert_is_not_success(self):
        sdk = connection()
        sdk.upsertVertex.return_value = 0
        self.assertEqual(write_graph_case(record(), connection=sdk)["status"], "failed")

    def test_live_schema_uses_outcome_and_existing_edges(self):
        sdk = connection()
        sdk.getSchema.return_value = json.loads((Path(__file__).parent / "fixtures/closedcase_schema.json").read_text())
        sdk.getVerticesById.side_effect = lambda kind, ident: [{"v_id": ident}]
        sdk.upsertEdge.return_value = 1
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "success")
        self.assertEqual(result["record_attribute"], "outcome")
        attrs = sdk.upsertVertex.call_args.args[2]
        self.assertEqual(json.loads(attrs["outcome"])["flagged_txn_id"], "3514030")
        self.assertNotIn("closed_at", attrs)
        self.assertNotIn("first_fraud_txn_id", attrs)
        self.assertEqual(sdk.upsertEdge.call_count, 2)
        sdk.upsertEdge.assert_any_call("ClosedCase", "HHG-001", "ON_CARD", "Card", "21139", vertexMustExist=True)
        self.assertIsNone(result["error"])

    def test_previous_schema_failure_now_has_useful_error(self):
        sdk = connection()
        sdk.getSchema.return_value["VertexTypes"][0]["Attributes"] = []
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["error"]["code"], "missing_record_attribute")
        self.assertIn("STRING", result["error"]["message"])
        self.assertFalse(result["write_attempted"])

    def test_permission_error_is_failed_and_never_copies_response(self):
        sdk = connection()
        response = Response()
        response.status_code = 403
        response._content = b"secret-token"
        sdk.upsertVertex.side_effect = HTTPError("secret-token", response=response)
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["error"]["code"], "http_403")
        self.assertNotIn("secret-token", json.dumps(result))

    def test_timeout_after_write_is_uncertain(self):
        sdk = connection()
        sdk.upsertVertex.side_effect = Timeout("secret-token")
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "uncertain")
        self.assertEqual(result["error"]["stage"], "vertex_write")
        self.assertNotIn("secret-token", json.dumps(result))

    def test_missing_edge_targets_do_not_create_stub_vertices(self):
        sdk = connection()
        sdk.getSchema.return_value = json.loads((Path(__file__).parent / "fixtures/closedcase_schema.json").read_text())
        sdk.getVerticesById.return_value = []
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "success")
        sdk.upsertEdge.assert_not_called()
        self.assertTrue(all(e["status"] == "skipped" for e in result["edges"]))

    def test_sdk_application_rejection_keeps_only_safe_code(self):
        from pyTigerGraph.common.exception import TigerGraphException
        sdk = connection()
        sdk.upsertVertex.side_effect = TigerGraphException("secret-token", "REST-30000")
        result = write_graph_case(record(), connection=sdk)
        self.assertEqual(result["status"], "failed")
        self.assertEqual(result["error"]["code"], "REST-30000")
        self.assertNotIn("secret-token", json.dumps(result))
