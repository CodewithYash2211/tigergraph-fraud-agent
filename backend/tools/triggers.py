"""Read benchmark triggers without modifying source data."""
import csv
import re
from pathlib import Path

CASE_PACK = Path(__file__).resolve().parents[2] / "data" / "case_pack.csv"


class InvestigationError(ValueError):
    def __init__(self, code, message, status_code=422):
        super().__init__(message)
        self.code = code
        self.status_code = status_code


def load_trigger(case_id, flagged_txn_id=None, path=None):
    if not isinstance(case_id, str) or not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_-]{0,79}", case_id):
        raise InvestigationError("invalid_case", "Invalid case ID.")
    with Path(path or CASE_PACK).open(encoding="utf-8-sig", newline="") as handle:
        record = next((r for r in csv.DictReader(handle) if r["case_id"] == case_id), None)
    if record is None:
        raise InvestigationError("case_not_found", "Case was not found in the case pack.", 404)
    if flagged_txn_id and flagged_txn_id != record["flagged_txn_id"]:
        raise InvestigationError("transaction_mismatch", "Transaction does not match the case pack.")
    return record


def trigger_response(record):
    # This specific denial is provided in the benchmark, not simulated.
    if record.get("trigger_type") == "customer_report" and "i never made this" in record.get("trigger_text", "").lower():
        return "DENIED"
    return "UNKNOWN"
