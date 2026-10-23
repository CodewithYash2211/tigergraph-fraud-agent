import csv
import hashlib
from pathlib import Path
import unittest
from uuid import uuid4

from ml.dataset import DatasetValidationError, load_dataset


class DatasetTests(unittest.TestCase):
    def setUp(self):
        # Default inherited ACLs avoid Windows sandbox issues with tempfile's 0700.
        self.directory = Path(__file__).resolve().parent / ("ml_test_" + uuid4().hex)
        self.directory.mkdir()
        self.addCleanup(self.cleanup_files)
        self.transactions = self.directory / "transactions.csv"
        self.history = self.directory / "closed_cases_history.csv"
        self.txns = [dict(TransactionID=str(i), customer_id="C1", ts="2016-07-02 12:00:00",
                          TransactionAmt="12.50", risk_score="0.99" if i == 2 else "0.01",
                          analyst_notes="forbidden", outcome="forbidden") for i in range(1, 5)]
        self.cases = [dict(case_id="CC1", customer_id="C1", outcome="confirmed_fraud",
                           txn_ids="1|3", closed_at="2016-07-04 00:00:00"),
                      dict(case_id="CC2", customer_id="C1", outcome="cleared",
                           txn_ids="2", closed_at="2016-07-04 00:00:00")]

    def cleanup_files(self):
        self.transactions.unlink(missing_ok=True)
        self.history.unlink(missing_ok=True)
        self.directory.rmdir()

    def write(self):
        for path, rows in ((self.transactions, self.txns), (self.history, self.cases)):
            with path.open("w", newline="", encoding="utf-8") as handle:
                writer = csv.DictWriter(handle, fieldnames=list(rows[0]))
                writer.writeheader()
                writer.writerows(rows)

    def load(self):
        self.write()
        return load_dataset(self.transactions, self.history)

    def test_labels_provenance_and_unlabeled_exclusion(self):
        data = self.load()
        self.assertEqual({r["transaction_id"]: r["adjudicated_fraud"] for r in data.records}, {"1": 1, "2": 0, "3": 1})
        self.assertEqual(data.audit["unlabeled_count"], 1)
        self.assertEqual(data.audit["fraud_count"], 2)
        self.assertEqual(data.audit["cleared_count"], 1)
        self.assertTrue(all(r["source_case_id"] and r["label_source"] and r["label_known_at"] == r["closed_at"] for r in data.records))
        self.assertNotIn("4", {r["transaction_id"] for r in data.records})  # Same customer, no label propagation.

    def test_feature_allowlist_excludes_outcomes_and_scores(self):
        for row in self.load().records:
            self.assertEqual(set(row["features"]), {"TransactionAmt", "dist1", "dist2", "ProductCD", "channel", "card4", "card6", "P_emaildomain", "R_emaildomain"})
            self.assertEqual(row["features"]["TransactionAmt"], 12.5)

    def test_duplicate_links(self):
        self.cases[1].update(txn_ids="1", outcome="confirmed_fraud")
        with self.assertRaisesRegex(DatasetValidationError, "Duplicate transaction link"):
            self.load()

    def test_conflicting_labels(self):
        self.cases[1]["txn_ids"] = "1"
        with self.assertRaisesRegex(DatasetValidationError, "Conflicting labels"):
            self.load()

    def test_duplicate_link_inside_case(self):
        self.cases[0]["txn_ids"] = "1|1"
        with self.assertRaisesRegex(DatasetValidationError, "Duplicate transaction link"):
            self.load()

    def test_missing_transaction(self):
        self.cases[0]["txn_ids"] = "99"
        with self.assertRaisesRegex(DatasetValidationError, "IDs missing"):
            self.load()

    def test_customer_mismatch(self):
        self.txns[0]["customer_id"] = "wrong"
        with self.assertRaisesRegex(DatasetValidationError, "Customer mismatch"):
            self.load()

    def test_duplicate_transaction_ids(self):
        self.txns.append(dict(self.txns[0]))
        with self.assertRaisesRegex(DatasetValidationError, "duplicate TransactionID"):
            self.load()

    def test_label_before_transaction(self):
        self.cases[0]["closed_at"] = "2016-07-01"
        with self.assertRaisesRegex(DatasetValidationError, "predates transaction"):
            self.load()

    def test_unknown_outcome_not_coerced_to_negative(self):
        self.cases[0]["outcome"] = "pending"
        with self.assertRaisesRegex(DatasetValidationError, "Unsupported historical outcome"):
            self.load()

    def test_sources_unchanged(self):
        self.write()
        before = [hashlib.sha256(p.read_bytes()).digest() for p in (self.transactions, self.history)]
        load_dataset(self.transactions, self.history)
        self.assertEqual(before, [hashlib.sha256(p.read_bytes()).digest() for p in (self.transactions, self.history)])


if __name__ == "__main__":
    unittest.main()
