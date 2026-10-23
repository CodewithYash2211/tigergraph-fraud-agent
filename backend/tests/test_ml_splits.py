import unittest

from ml.dataset import DatasetValidationError
from ml.splits import build_splits


def record(txn, timestamp, closed, case=None):
    return {"transaction_id": txn, "source_case_id": case or txn,
            "timestamp": timestamp, "label_known_at": closed, "adjudicated_fraud": 1}


class SplitTests(unittest.TestCase):
    def test_temporal_disjointness_and_accounting(self):
        rows = [record("1", "2016-07-01", "2016-07-02"),
                record("2", "2016-08-31T23:59:59", "2016-08-31T23:59:59"),
                record("3", "2016-09-01", "2016-09-02"),
                record("4", "2016-10-01", "2016-11-06"),
                record("5", "2016-11-01", "2016-11-02")]
        result = build_splits(rows)
        self.assertEqual([len(v) for v in result["partitions"].values()], [2, 1, 1])
        ids = [r["transaction_id"] for bucket in [*result["partitions"].values(), result["excluded"]] for r in bucket]
        self.assertEqual(len(ids), len(set(ids)))
        self.assertEqual(set(ids), {r["transaction_id"] for r in rows})
        self.assertEqual(result["audit"]["accounted_labeled_transactions"], 5)
        self.assertEqual(result["excluded"][0]["exclusion_reason"], "outside_transaction_windows")

    def test_case_crossing_boundary_purges_entire_case(self):
        result = build_splits([record("1", "2016-08-30", "2016-09-03", "CC1"),
                               record("2", "2016-09-02", "2016-09-03", "CC1")])
        self.assertEqual(result["audit"]["exclusions_by_reason"], {"case_crosses_partition_boundary": 2})
        self.assertTrue(all(not v for v in result["partitions"].values()))

    def test_case_crossing_outside_window_also_purged(self):
        result = build_splits([record("1", "2016-10-31", "2016-11-02", "CC1"),
                               record("2", "2016-11-01", "2016-11-02", "CC1")])
        self.assertEqual(len(result["excluded"]), 2)

    def test_label_maturity_all_three_cutoffs(self):
        rows = [record("1", "2016-08-31", "2016-09-01"),
                record("2", "2016-09-30", "2016-10-01"),
                record("3", "2016-10-31", "2016-11-07")]
        result = build_splits(rows)
        self.assertEqual(result["audit"]["exclusions_by_reason"], {"label_not_mature_at_cutoff": 3})

    def test_duplicate_transaction_rejected(self):
        row = record("1", "2016-07-01", "2016-07-02")
        with self.assertRaisesRegex(DatasetValidationError, "Duplicate split transaction"):
            build_splits([row, row])

    def test_empty_dataset(self):
        result = build_splits([])
        self.assertEqual(result["audit"]["accounted_labeled_transactions"], 0)
        self.assertIsNone(result["audit"]["splits"]["train"]["date_range"])


if __name__ == "__main__":
    unittest.main()
