import copy
import json
import unittest
from unittest.mock import patch, Mock
from pathlib import Path
from ml.shadow import ARTIFACT_DIR, THRESHOLD, load_artifact, predict_transaction
from tests.workspace import output_directory
from tools.transaction import get_transaction


class ArtifactTests(unittest.TestCase):
    @classmethod
    def setUpClass(cls):
        cls.transaction = get_transaction("3514030")["raw"]

    def test_real_artifact_load(self):
        manifest, prep, model = load_artifact()
        self.assertEqual(manifest["threshold"], THRESHOLD)
        self.assertEqual(manifest["transformed_feature_count"], 245)
        self.assertEqual(model.n_features_in_, 245)

    def test_single_transaction_prediction_range_and_frozen_threshold(self):
        result = predict_transaction(self.transaction)
        self.assertTrue(result["available"], result)
        self.assertGreaterEqual(result["fraud_score"], 0)
        self.assertLessEqual(result["fraud_score"], 1)
        self.assertEqual(result["threshold"], THRESHOLD)
        self.assertEqual(result["prediction"], "fraud" if result["fraud_score"] >= THRESHOLD else "cleared")

    def test_missing_artifact_returns_none(self):
        with output_directory() as directory:
            result = predict_transaction(self.transaction, directory=directory)
        self.assertFalse(result["available"])
        self.assertIsNone(result["fraud_score"])

    def test_malformed_transaction(self):
        for raw in ({}, {"TransactionID": "1", "ts": "bad"}, {**self.transaction, "TransactionAmt": "inf"}):
            self.assertEqual(predict_transaction(raw)["error"]["code"], "malformed_transaction")

    def test_schema_mismatch(self):
        with output_directory() as directory:
            manifest = json.loads((ARTIFACT_DIR / "manifest.json").read_text())
            manifest["feature_schema_version"] = "wrong"
            (directory / "manifest.json").write_text(json.dumps(manifest))
            result = predict_transaction(self.transaction, directory=directory)
        self.assertEqual(result["error"]["code"], "schema_mismatch")
        self.assertIsNone(result["fraud_score"])

    def test_checksum_failure_before_deserialization(self):
        with patch("ml.shadow.digest", return_value="wrong"), patch("joblib.load") as loader:
            result = predict_transaction(self.transaction)
            loader.assert_not_called()
        self.assertEqual(result["error"]["code"], "artifact_integrity_error")

    def test_frozen_threshold_not_manifest_override(self):
        with output_directory() as directory:
            manifest = json.loads((ARTIFACT_DIR / "manifest.json").read_text())
            manifest["threshold"] = 0.5
            (directory / "manifest.json").write_text(json.dumps(manifest))
            self.assertFalse(predict_transaction(self.transaction, directory=directory)["available"])


if __name__ == "__main__":
    unittest.main()
