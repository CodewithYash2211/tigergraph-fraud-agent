"""Stream source CSVs read-only and validate explicit transaction adjudications."""
import csv
from dataclasses import dataclass

from .config import HISTORY_PATH, TRANSACTIONS_PATH, LABELS, LABEL_SOURCE, parse_timestamp
from .features import extract_features


class DatasetValidationError(ValueError):
    """Input integrity failure: do not silently build a supervised dataset."""


@dataclass
class AuditDataset:
    records: list
    audit: dict


def _require_columns(columns, required, source):
    missing = set(required) - set(columns or [])
    if missing:
        raise DatasetValidationError(f"{source}: missing columns {sorted(missing)}")


def _timestamp(value, context):
    try:
        return parse_timestamp(value)
    except (ValueError, TypeError) as exc:
        raise DatasetValidationError(f"Invalid timestamp in {context}") from exc


def _range(values):
    return {"start": min(values).isoformat(), "end": max(values).isoformat()} if values else None


def load_dataset(transactions_path=TRANSACTIONS_PATH, history_path=HISTORY_PATH, *, feature_extractor=extract_features):
    links, cases = {}, set()
    with open(history_path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        _require_columns(reader.fieldnames, ("case_id", "customer_id", "outcome", "txn_ids", "closed_at"), "history")
        for row in reader:
            case_id = row["case_id"].strip()
            if not case_id or case_id in cases:
                raise DatasetValidationError("Empty or duplicate historical case ID")
            cases.add(case_id)
            outcome = row["outcome"].strip()
            if outcome not in LABELS:
                raise DatasetValidationError(f"Unsupported historical outcome in {case_id}")
            customer = row["customer_id"].strip()
            if not customer:
                raise DatasetValidationError(f"Missing historical customer in {case_id}")
            closed = _timestamp(row["closed_at"], case_id)
            ids = [t.strip() for t in row["txn_ids"].split("|")]
            if not all(ids):
                raise DatasetValidationError(f"Empty transaction link in {case_id}")
            for txn_id in ids:
                if txn_id in links:
                    kind = "Conflicting labels" if links[txn_id]["adjudicated_fraud"] != LABELS[outcome] else "Duplicate transaction link"
                    raise DatasetValidationError(f"{kind}: {txn_id}")
                links[txn_id] = {
                    "transaction_id": txn_id, "adjudicated_fraud": LABELS[outcome],
                    "source_case_id": case_id, "label_source": LABEL_SOURCE,
                    "label_known_at": closed.isoformat(), "closed_at": closed.isoformat(),
                    "customer_id": customer,
                }
    seen, records = set(), []
    earliest = latest = None
    with open(transactions_path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.reader(handle)
        header = next(reader, [])
        _require_columns(header, ("TransactionID", "customer_id", "ts", "TransactionAmt"), "transactions")
        if len(header) != len(set(header)):
            raise DatasetValidationError("Duplicate transaction column names")
        indices = {name: header.index(name) for name in ("TransactionID", "customer_id", "ts")}
        for values in reader:
            if len(values) != len(header):
                raise DatasetValidationError("Malformed transaction CSV row")
            txn_id = values[indices["TransactionID"]].strip()
            if not txn_id or txn_id in seen:
                raise DatasetValidationError(f"Empty or duplicate TransactionID: {txn_id}")
            seen.add(txn_id)
            timestamp = _timestamp(values[indices["ts"]], txn_id)
            earliest = min(earliest, timestamp) if earliest else timestamp
            latest = max(latest, timestamp) if latest else timestamp
            if txn_id not in links:
                continue  # Shared entities never propagate labels.
            label = links[txn_id]
            if values[indices["customer_id"]].strip() != label["customer_id"]:
                raise DatasetValidationError(f"Customer mismatch: {txn_id}")
            if parse_timestamp(label["label_known_at"]) < timestamp:
                raise DatasetValidationError(f"Label predates transaction: {txn_id}")
            try:
                features = feature_extractor(dict(zip(header, values)))
            except ValueError as exc:
                raise DatasetValidationError(f"Invalid feature for transaction {txn_id}") from exc
            records.append({**label, "timestamp": timestamp.isoformat(), "features": features})
    missing = set(links) - seen
    if missing:
        raise DatasetValidationError(f"Historical transaction IDs missing: {len(missing)}; examples: {sorted(missing)[:5]}")
    fraud = sum(r["adjudicated_fraud"] for r in records)
    return AuditDataset(records, {
        "total_transactions": len(seen), "historical_cases": len(cases),
        "labeled_transactions": len(records), "fraud_count": fraud,
        "cleared_count": len(records) - fraud, "unlabeled_count": len(seen) - len(records),
        "transaction_date_range": _range([earliest, latest]) if seen else None,
        "labeled_date_range": _range([parse_timestamp(r["timestamp"]) for r in records]),
        "label_known_date_range": _range([parse_timestamp(r["label_known_at"]) for r in records]),
        "label_source": LABEL_SOURCE,
    })
