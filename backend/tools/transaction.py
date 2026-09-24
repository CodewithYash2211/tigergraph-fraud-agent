import csv
import os
from typing import Dict, Any


DATA_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "data",
    "transactions.csv"
)


def get_transaction(txn_id: str) -> Dict[str, Any]:
    """
    Find one transaction by TransactionID.

    Uses streaming CSV reading so the 675 MB file
    is not loaded into memory.
    """

    with open(
        DATA_PATH,
        "r",
        encoding="utf-8-sig",
        errors="ignore",
        newline=""
    ) as file:

        reader = csv.DictReader(file)

        for row in reader:

            if row.get("TransactionID") == str(txn_id):

                return _normalize(row)

    return {
        "found": False,
        "transaction_id": str(txn_id),
        "message": "Transaction not found"
    }

def _normalize(row):
    return {
        "found": True,
        "transaction_id": row.get("TransactionID"),
        "amount": row.get("TransactionAmt"),
        "customer_id": row.get("customer_id"),
        "timestamp": row.get("ts"),
        "channel": row.get("channel"),
        "risk_score": row.get("risk_score"),
        "product": row.get("ProductCD"),
        "card_type": row.get("card4"),
        "card_category": row.get("card6"),
        "email_domain": row.get("P_emaildomain"),
        "billing_address": row.get("addr1"),
        "raw": row
    }


def get_transactions(txn_ids):
    """Read requested benchmark transactions in one streaming pass."""
    wanted = {str(txn_id) for txn_id in txn_ids}
    results = {}
    if not wanted:
        return results
    with open(DATA_PATH, encoding="utf-8-sig", errors="ignore", newline="") as handle:
        for row in csv.DictReader(handle):
            txn_id = row.get("TransactionID")
            if txn_id in wanted:
                results[txn_id] = _normalize(row)
                if len(results) == len(wanted):
                    break
    return results
