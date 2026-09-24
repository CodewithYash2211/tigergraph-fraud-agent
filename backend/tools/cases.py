import csv
from datetime import datetime
from pathlib import Path
from typing import Dict, Any

HISTORY_PATH = Path(__file__).resolve().parents[2] / "data" / "closed_cases_history.csv"


def find_similar_cases(
    transaction_id: str,
    pattern: str | None = None,
    *, customer_id=None, card_id=None, as_of=None, path=None, limit=5,
) -> Dict[str, Any]:
    """Match identifiers against cases closed before the investigation opened.

    Pattern alone never establishes a match, and future case outcomes are excluded.
    """
    result = {"transaction_id": transaction_id, "similar_cases": [], "findings": [], "status": "unavailable"}
    if not as_of:
        result["reason"] = "Missing investigation time; prior-case eligibility cannot be verified."
        return result
    try:
        cutoff = datetime.fromisoformat(as_of)
        matches = []
        with Path(path or HISTORY_PATH).open(encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                try:
                    if datetime.fromisoformat(row["closed_at"]) > cutoff:
                        continue
                except (ValueError, TypeError):
                    continue
                reasons = []
                if transaction_id in row.get("txn_ids", "").split("|"):
                    reasons.append("same_transaction")
                if card_id and row.get("card_id") == card_id:
                    reasons.append("same_card")
                if customer_id and row.get("customer_id") == customer_id:
                    reasons.append("same_customer")
                if not reasons:
                    continue
                matches.append({**row, "match_reasons": reasons,
                                "same_pattern": bool(pattern and row.get("pattern") == pattern)})
        matches.sort(key=lambda r: ("same_transaction" in r["match_reasons"],
                                   "same_card" in r["match_reasons"], r["closed_at"]), reverse=True)
        result.update(status="complete", similar_cases=matches[:limit], matched_count=len(matches),
                      findings=[{"case_id": r["case_id"], "match_reasons": r["match_reasons"]} for r in matches[:limit]])
    except (OSError, ValueError, KeyError):
        result["reason"] = "Historical case data unavailable or invalid."
    return result
