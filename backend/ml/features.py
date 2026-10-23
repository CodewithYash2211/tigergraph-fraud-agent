"""Conservative prediction-time allowlist, separate from label/audit metadata.

No fitting, encoding, imputation or model training occurs in phase one.
Masked C/D/M/V/id features await a feature provenance review.
"""
import math
from .config import parse_timestamp

CORE_NUMERIC = ("TransactionAmt", "dist1", "dist2", "hour", "weekday")
CORE_CATEGORICAL = (
    "ProductCD", "channel", "card1", "card2", "card3", "card4", "card5", "card6",
    "addr1", "addr2", "P_emaildomain", "R_emaildomain", "DeviceType", "DeviceInfo",
)
MISSING_SOURCES = ("TransactionAmt", "dist1", "dist2", "DeviceType", "DeviceInfo")
CORE_INDICATORS = tuple(name + "_missing" for name in MISSING_SOURCES) + ("identity_missing",)
CORE_COLUMNS = CORE_NUMERIC + CORE_CATEGORICAL + CORE_INDICATORS
CORE_VERSION = "core-v1"


def clean_value(value):
    if value is None:
        return None
    text = str(value).strip()
    return None if text.lower() in ("", "nan", "null", "none", "na") else text


def extract_core_features(row):
    """Snapshot-only extraction; never learns from other rows or reads outcomes."""
    result = {}
    for name in ("TransactionAmt", "dist1", "dist2"):
        value = clean_value(row.get(name))
        result[name] = None if value is None else float(value)
        if result[name] is not None and not math.isfinite(result[name]):
            raise ValueError(f"Nonfinite numeric feature: {name}")
    timestamp = parse_timestamp(row["ts"])
    result.update(hour=timestamp.hour, weekday=timestamp.weekday())
    for name in CORE_CATEGORICAL:
        # Card/address codes are categories, not ordered measurements.
        result[name] = clean_value(row.get(name)) if name not in ("DeviceType", "DeviceInfo") else None
    return with_identity(result, None)


def with_identity(features, identity):
    result = dict(features)
    for name in ("DeviceType", "DeviceInfo"):
        result[name] = clean_value(identity.get(name)) if identity is not None else None
    for name in MISSING_SOURCES:
        result[name + "_missing"] = int(result[name] is None)
    result["identity_missing"] = int(identity is None)
    return result

NUMERIC_FEATURES = ("TransactionAmt", "dist1", "dist2")
CATEGORICAL_FEATURES = (
    "ProductCD", "channel", "card4", "card6", "P_emaildomain", "R_emaildomain",
)
FEATURE_COLUMNS = NUMERIC_FEATURES + CATEGORICAL_FEATURES


def extract_features(row):
    features = {}
    for name in NUMERIC_FEATURES:
        value = row.get(name, "").strip()
        if value.lower() in ("", "nan", "null", "none", "na"):
            features[name] = None
        else:
            number = float(value)
            if not math.isfinite(number):
                raise ValueError(f"Nonfinite numeric feature: {name}")
            features[name] = number
    for name in CATEGORICAL_FEATURES:
        features[name] = row.get(name, "").strip() or None
    return features
