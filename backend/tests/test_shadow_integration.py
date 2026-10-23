"""Production-runtime tests: ML dependency imports are deliberately unnecessary."""
import contextlib
import io
import json
import subprocess
import unittest
from unittest.mock import patch, Mock
from pathlib import Path
from agent.workflow import fraud_agent
from tools.ml import score_transaction
from ml.shadow import THRESHOLD, unavailable
from tests.workspace import output_directory


class ShadowToolTests(unittest.TestCase):
    def txn(self):
        return {"transaction_id": "1", "raw": {"TransactionID": "1", "ts": "2016-07-01"}}

    def test_missing_artifact_no_fabricated_score(self):
        with patch("pathlib.Path.is_file", return_value=False):
            result = score_transaction(self.txn())
        self.assertFalse(result["available"])
        self.assertIsNone(result["fraud_score"])
        self.assertEqual(result["error"]["code"], "artifact_missing")

    def test_malformed_transaction(self):
        self.assertEqual(score_transaction({})["error"]["code"], "malformed_transaction")

    def test_timeout_is_sanitized(self):
        with patch("pathlib.Path.is_file", return_value=True), patch("subprocess.run", side_effect=subprocess.TimeoutExpired("secret", 45)):
            result = score_transaction(self.txn())
        self.assertIsNone(result["fraud_score"])
        self.assertNotIn("secret", json.dumps(result))

    def test_worker_cannot_inject_actions_or_change_threshold(self):
        reply = {"available": True, "fraud_score": 0.99, "threshold": THRESHOLD, "final_actions": ["BLOCK_CARD"]}
        with patch("pathlib.Path.is_file", return_value=True), patch("subprocess.run", return_value=Mock(returncode=0, stdout=json.dumps(reply))):
            result = score_transaction(self.txn())
        self.assertNotIn("final_actions", result)
        self.assertEqual(result["prediction"], "fraud")
        reply["threshold"] = 0.5
        with patch("pathlib.Path.is_file", return_value=True), patch("subprocess.run", return_value=Mock(returncode=0, stdout=json.dumps(reply))):
            self.assertFalse(score_transaction(self.txn())["available"])

    def test_invalid_probability(self):
        for score in (-1, 2, None, True):
            reply = {"available": True, "fraud_score": score, "threshold": THRESHOLD}
            with patch("pathlib.Path.is_file", return_value=True), patch("subprocess.run", return_value=Mock(returncode=0, stdout=json.dumps(reply))):
                self.assertIsNone(score_transaction(self.txn())["fraud_score"])


class ShadowWorkflowTests(unittest.TestCase):
    def run_case(self, prediction=None, failure=None):
        fixture = json.loads((Path(__file__).parent / "fixtures/tigergraph_3514030.json").read_text())
        txn = {"found": True, "transaction_id": "3514030", "customer_id": "C12382", "amount": "77.07", "risk_score": "0.61", "channel": "in_person"}
        with output_directory() as directory, contextlib.redirect_stdout(io.StringIO()), \
                patch("agent.workflow.get_transaction", return_value=txn), \
                patch("tools.tigergraph_client.TigerGraphClient.run_query", side_effect=lambda name, txn: fixture[name]), \
                patch("tools.artifacts.write_graph_case", return_value={"status": "not_attempted"}), \
                patch("agent.workflow.score_transaction", return_value=prediction, side_effect=failure):
            return fraud_agent.invoke({"case_id": "HHG-001", "flagged_txn_id": "3514030", "case_output_dir": str(directory)})

    def test_high_low_and_failure_do_not_change_policy_or_assessment(self):
        baseline = self.run_case(unavailable("artifact_missing"))
        for prediction, failure in (({"available": True, "fraud_score": 1.0}, None),
                                    ({"available": True, "fraud_score": 0.0}, None),
                                    (None, RuntimeError("private details"))):
            result = self.run_case(prediction, failure)
            for key in ("fraud_probability", "risk_score", "assessment", "evidence_count", "pattern", "uncertainty", "initial_actions", "final_actions", "final_approval_routes", "file_report"):
                self.assertEqual(result[key], baseline[key], key)
            if failure:
                self.assertIsNone(result["ml_prediction"]["fraud_score"])
                self.assertNotIn("private details", json.dumps(result["ml_prediction"]))


if __name__ == "__main__":
    unittest.main()
