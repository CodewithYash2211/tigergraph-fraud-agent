import copy
import csv
import importlib.util
from pathlib import Path
import unittest
from unittest.mock import patch
from uuid import uuid4

from ml.dataset import AuditDataset, DatasetValidationError
from ml.features import CORE_COLUMNS, CORE_CATEGORICAL, extract_core_features, with_identity
from ml.preprocessing import load_core_dataset, raw_rows, prepare_features, make_preprocessor, _array
from ml.splits import build_splits


def record(txn, date, amount="10", category="known", closed=None):
    return {"transaction_id": txn, "source_case_id": txn, "adjudicated_fraud": int(txn != "b"),
            "timestamp": date, "label_known_at": closed or date,
            "features": extract_core_features({"ts": date, "TransactionAmt": amount, "ProductCD": category})}


def sample():
    return [record("a", "2016-07-02", "10"), record("b", "2016-08-02", "30"),
            record("v", "2016-09-02", "10000", "unseen"), record("t", "2016-10-02", "", "new")]


class CoreFeatureTests(unittest.TestCase):
    def test_exact_allowlist_and_no_leakage(self):
        forbidden = ("risk_score", "outcome", "pattern", "txn_ids", "first_fraud_txn_id", "actions_taken",
                     "analyst_notes", "report_filed", "closed_at", "label_known_at", "TransactionID",
                     "customer_id", "case_id", "agent_output", "id_01")
        row = {name: "forbidden" for name in forbidden}
        row.update(ts="2016-07-02T23:15:00", TransactionAmt="7.5", card1="123.0")
        features = extract_core_features(row)
        self.assertEqual(set(features), set(CORE_COLUMNS))
        self.assertEqual(len(features), 25)
        self.assertFalse(set(features) & set(forbidden))
        self.assertEqual(features["hour"], 23)
        self.assertEqual(features["weekday"], 5)
        self.assertEqual(features["card1"], "123.0")

    def test_missingness_and_identity_present_but_empty(self):
        features = extract_core_features({"ts": "2016-07-02", "TransactionAmt": "nan", "dist1": "NULL"})
        self.assertEqual(features["TransactionAmt_missing"], 1)
        self.assertEqual(features["identity_missing"], 1)
        joined = with_identity(features, {"DeviceType": "", "DeviceInfo": "NaN", "id_01": "ignored"})
        self.assertEqual(joined["identity_missing"], 0)
        self.assertEqual(joined["DeviceInfo_missing"], 1)
        self.assertEqual(features["identity_missing"], 1)  # No input mutation.

    def test_extra_feature_rejected(self):
        rows = sample()
        rows[0]["features"]["risk_score"] = 0.9
        with self.assertRaises(DatasetValidationError):
            raw_rows(rows)

    def test_raw_determinism_and_split_identity(self):
        rows = sample()
        before = copy.deepcopy(rows)
        self.assertEqual(raw_rows(rows), raw_rows(rows))
        split = build_splits(rows)["partitions"]
        self.assertEqual([[r["transaction_id"] for r in v] for v in split.values()], [["a", "b"], ["v"], ["t"]])
        self.assertEqual(rows, before)

    def test_nonfinite_numeric_rejected(self):
        with self.assertRaises(ValueError):
            extract_core_features({"ts": "2016-07-02", "TransactionAmt": "inf"})

    def identity_file(self, rows):
        path = Path(__file__).parent / ("ml_identity_" + uuid4().hex + ".csv")
        self.addCleanup(lambda: path.unlink(missing_ok=True))
        with path.open("w", newline="", encoding="utf-8") as handle:
            writer = csv.DictWriter(handle, fieldnames=["TransactionID", "DeviceType", "DeviceInfo", "id_01"])
            writer.writeheader()
            writer.writerows(rows)
        return path

    def test_identity_join_preserves_order_and_unmatched_rows(self):
        path = self.identity_file([{"TransactionID": "b", "DeviceType": "mobile", "DeviceInfo": "phone", "id_01": "secret"}])
        with patch("ml.preprocessing._require_columns"), patch("ml.preprocessing.load_dataset", return_value=AuditDataset(sample(), {})):
            result = load_core_dataset(transactions_path=path, identity_path=path)
        self.assertEqual([r["transaction_id"] for r in result.records], ["a", "b", "v", "t"])
        self.assertEqual(result.records[1]["features"]["DeviceInfo"], "phone")
        self.assertEqual(result.records[0]["features"]["identity_missing"], 1)
        self.assertNotIn("id_01", result.records[1]["features"])
        self.assertEqual(result.audit["labeled_identity_matches"], 1)

    def test_duplicate_identity_rejected(self):
        row = {"TransactionID": "b", "DeviceType": "", "DeviceInfo": "", "id_01": ""}
        path = self.identity_file([row, row])
        with patch("ml.preprocessing._require_columns"), patch("ml.preprocessing.load_dataset", return_value=AuditDataset(sample(), {})):
            with self.assertRaisesRegex(DatasetValidationError, "duplicate identity"):
                load_core_dataset(transactions_path=path, identity_path=path)


AVAILABLE = all(importlib.util.find_spec(name) is not None for name in ("numpy", "scipy", "sklearn"))


@unittest.skipUnless(AVAILABLE, "Optional ML dependencies unavailable; no automatic installation")
class TransformationTests(unittest.TestCase):
    def test_training_statistics_ignore_validation_test(self):
        output = prepare_features(sample())
        self.assertEqual(output["metadata"]["numeric_medians"][0], 20)
        self.assertEqual(output["metadata"]["numeric_means"][0], 20)
        self.assertNotIn("value:unseen", output["metadata"]["training_categories"]["ProductCD"])
        changed = sample()
        changed[2]["features"]["TransactionAmt"] = 1e9
        changed[2]["features"]["ProductCD"] = "different"
        other = prepare_features(changed)
        self.assertEqual(output["metadata"]["numeric_medians"], other["metadata"]["numeric_medians"])
        self.assertEqual(output["metadata"]["training_categories"], other["metadata"]["training_categories"])

    def test_validation_test_unseen_categories_and_missing_values(self):
        import numpy as np
        result = prepare_features(sample())
        widths = set()
        for name, count in (("train", 2), ("validation", 1), ("test", 1)):
            matrix = result["matrices"][name]
            self.assertEqual(matrix.shape[0], count)
            self.assertTrue(np.isfinite(matrix.data).all())
            widths.add(matrix.shape[1])
        self.assertEqual(len(widths), 1)

    def test_row_and_label_alignment(self):
        import numpy as np
        from scipy import sparse

        rows = sample()
        result = prepare_features(rows)
        for name, partition in build_splits(rows)["partitions"].items():
            self.assertEqual(result["aligned"][name]["transaction_ids"], [r["transaction_id"] for r in partition])
            self.assertEqual(result["aligned"][name]["labels"], [r["adjudicated_fraud"] for r in partition])
            self.assertEqual(result["aligned"][name]["source_case_ids"], [r["source_case_id"] for r in partition])
            self.assertEqual(result["matrices"][name].shape[0], len(partition))
            for index, row in enumerate(partition):
                transformed = result["preprocessor"].transform(_array([row], np))
                # Dense ColumnTransformer output can retain object dtype from
                # passthrough flags. The pipeline explicitly converts it to float
                # CSR; make the independently transformed row numeric as well.
                actual = sparse.csr_matrix(transformed, dtype=np.float64).toarray()
                expected = result["matrices"][name][index].toarray()
                self.assertEqual(expected.shape, actual.shape)
                self.assertTrue(np.isfinite(expected).all())
                self.assertTrue(np.isfinite(actual).all())
                np.testing.assert_allclose(expected, actual, equal_nan=False)

    def test_determinism(self):
        first, second = prepare_features(sample()), prepare_features(sample())
        self.assertEqual(first["metadata"], second["metadata"])
        for name in first["matrices"]:
            self.assertEqual((first["matrices"][name] != second["matrices"][name]).nnz, 0)

    def test_bounded_categories(self):
        rows = [record(str(i), "2016-07-02", category=str(i)) for i in range(100)]
        result = prepare_features(rows)
        self.assertLessEqual(result["metadata"]["transformed_feature_count"], 5 + 6 + 32 * len(CORE_CATEGORICAL))

    def test_only_train_is_fitted(self):
        processor = make_preprocessor()
        with patch("ml.preprocessing.make_preprocessor", return_value=processor):
            with patch.object(processor, "fit_transform", wraps=processor.fit_transform) as fitted:
                prepare_features(sample())
                self.assertEqual(fitted.call_count, 1)
                self.assertEqual(fitted.call_args.args[0].shape[0], 2)

    def test_immature_and_cross_boundary_records_still_excluded(self):
        rows = sample() + [record("late", "2016-08-31", closed="2016-09-02")]
        result = prepare_features(rows)
        self.assertNotIn("late", result["aligned"]["train"]["transaction_ids"])
        self.assertEqual(result["metadata"]["split_audit"]["excluded_count"], 1)


if __name__ == "__main__":
    unittest.main()
