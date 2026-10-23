"""Leakage-safe partitions. Run from backend: python -B -m ml.splits

Prints JSON to stdout only; never writes or modifies source/artifact files.
"""
import argparse
from collections import Counter, defaultdict
import json

from .config import SPLIT_WINDOWS, LABEL_CUTOFFS, TRANSACTIONS_PATH, HISTORY_PATH, parse_timestamp
from .dataset import DatasetValidationError, load_dataset, _range


def build_splits(records):
    buckets = {name: [] for name in SPLIT_WINDOWS}
    excluded, assignments, case_windows, seen = [], {}, defaultdict(set), set()
    for row in records:
        txn_id = row["transaction_id"]
        if txn_id in seen:
            raise DatasetValidationError(f"Duplicate split transaction: {txn_id}")
        seen.add(txn_id)
        timestamp = parse_timestamp(row["timestamp"])
        window = next((name for name, (start, end) in SPLIT_WINDOWS.items() if start <= timestamp < end), "outside_window")
        assignments[txn_id] = window
        case_windows[row["source_case_id"]].add(window)
    for row in records:
        window = assignments[row["transaction_id"]]
        reason = None
        if len(case_windows[row["source_case_id"]]) > 1:
            reason = "case_crosses_partition_boundary"
        elif window == "outside_window":
            reason = "outside_transaction_windows"
        elif parse_timestamp(row["label_known_at"]) >= LABEL_CUTOFFS[window]:
            reason = "label_not_mature_at_cutoff"
        if reason:
            excluded.append({**row, "exclusion_reason": reason})
        else:
            buckets[window].append(row)
    report = {}
    for name, rows in buckets.items():
        positive = sum(r["adjudicated_fraud"] for r in rows)
        report[name] = {
            "count": len(rows), "fraud_count": positive, "cleared_count": len(rows) - positive,
            "date_range": _range([parse_timestamp(r["timestamp"]) for r in rows]),
            "label_known_date_range": _range([parse_timestamp(r["label_known_at"]) for r in rows]),
            "window_start_inclusive": SPLIT_WINDOWS[name][0].isoformat(),
            "window_end_exclusive": SPLIT_WINDOWS[name][1].isoformat(),
            "label_cutoff_exclusive": LABEL_CUTOFFS[name].isoformat(),
        }
    return {"partitions": buckets, "excluded": excluded, "audit": {
        "splits": report, "excluded_count": len(excluded),
        "exclusions_by_reason": dict(Counter(r["exclusion_reason"] for r in excluded)),
        "accounted_labeled_transactions": sum(len(rows) for rows in buckets.values()) + len(excluded),
    }}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--transactions", default=str(TRANSACTIONS_PATH))
    parser.add_argument("--history", default=str(HISTORY_PATH))
    args = parser.parse_args()
    try:
        dataset = load_dataset(args.transactions, args.history)
        split = build_splits(dataset.records)
    except (DatasetValidationError, OSError) as exc:
        parser.exit(1, f"ML audit failed: {exc}\n")
    print(json.dumps({**dataset.audit, **split["audit"]}, indent=2))


if __name__ == "__main__":
    main()
