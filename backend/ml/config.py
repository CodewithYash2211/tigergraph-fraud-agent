"""Explicit, reproducible configuration for the phase-one offline audit."""
from datetime import datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
TRANSACTIONS_PATH = REPO_ROOT / "data" / "transactions.csv"
HISTORY_PATH = REPO_ROOT / "data" / "closed_cases_history.csv"
IDENTITY_PATH = REPO_ROOT / "data" / "identity.csv"
LABELS = {"confirmed_fraud": 1, "cleared": 0}
LABEL_SOURCE = "closed_cases_history.csv:outcome via txn_ids"
# Half-open transaction windows. Labels must be known strictly before cutoff.
SPLIT_WINDOWS = {
    "train": (datetime(2016, 7, 1), datetime(2016, 9, 1)),
    "validation": (datetime(2016, 9, 1), datetime(2016, 10, 1)),
    "test": (datetime(2016, 10, 1), datetime(2016, 11, 1)),
}
LABEL_CUTOFFS = {
    "train": datetime(2016, 9, 1),
    "validation": datetime(2016, 10, 1),
    "test": datetime(2016, 11, 7),
}


def parse_timestamp(value):
    """Dataset timestamps are naive, consistently expressed wall-clock times."""
    result = datetime.fromisoformat(value)
    if result.tzinfo is not None:
        raise ValueError("Timezone-aware timestamps require an explicit time convention.")
    return result
