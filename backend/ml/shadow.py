"""Versioned local inference, run only inside .venv-ml. Never evaluates policy."""
import csv
import hashlib
import importlib.metadata
import json
import math
from pathlib import Path
import sys

from .config import IDENTITY_PATH
from .features import CORE_COLUMNS, CORE_VERSION, extract_core_features, with_identity

ARTIFACT_DIR = Path(__file__).resolve().parent / "artifacts" / "xgboost-core-v1"
MODEL_VERSION = "xgboost-core-v1-seed42"
THRESHOLD = 0.8961541056632996


def digest(path):
    return hashlib.sha256(Path(path).read_bytes()).hexdigest()


def unavailable(code):
    return {"available": False, "mode": "shadow", "model_name": "XGBoost",
            "model_version": MODEL_VERSION, "feature_schema_version": CORE_VERSION,
            "fraud_score": None, "threshold": THRESHOLD, "prediction": None,
            "risk_level": None, "error": {"code": code}}


def load_artifact(directory=ARTIFACT_DIR):
    """Only trusted, locally generated joblib artifacts are supported.

    Checksums catch corruption, not hostile replacements of the manifest itself.
    Do not load downloads/uploads or allow untrusted writes to this directory.
    """
    import joblib
    from xgboost import XGBClassifier
    manifest = json.loads((directory / "manifest.json").read_text())
    if (manifest["feature_schema_version"] != CORE_VERSION or
            manifest["feature_names"] != list(CORE_COLUMNS) or
            manifest["threshold"] != THRESHOLD or manifest["model_version"] != MODEL_VERSION):
        raise ValueError("schema_mismatch")
    for name, expected in manifest["versions"].items():
        if importlib.metadata.version(name) != expected:
            raise ValueError("environment_mismatch")
    for filename in ("model.ubj", "preprocessor.joblib"):
        if digest(directory / filename) != manifest["sha256"][filename]:
            raise ValueError("artifact_integrity_error")
    preprocessor = joblib.load(directory / "preprocessor.joblib")
    model = XGBClassifier()
    model.load_model(directory / "model.ubj")
    if len(preprocessor.get_feature_names_out(list(CORE_COLUMNS))) != manifest["transformed_feature_count"]:
        raise ValueError("schema_mismatch")
    return manifest, preprocessor, model


def predict_transaction(raw, directory=ARTIFACT_DIR, identity_path=IDENTITY_PATH):
    from .preprocessing import _array
    import numpy as np
    from scipy.sparse import csr_matrix
    if not isinstance(raw, dict) or not raw.get("TransactionID") or not raw.get("ts"):
        return unavailable("malformed_transaction")
    required = set(CORE_COLUMNS[:19]) - {"hour", "weekday", "DeviceType", "DeviceInfo"}
    if not required.issubset(raw):
        return unavailable("malformed_transaction")
    try:
        features = extract_core_features(raw)
    except (ValueError, TypeError, KeyError):
        return unavailable("malformed_transaction")
    try:
        manifest, prep, model = load_artifact(directory)
        identity = None
        with open(identity_path, encoding="utf-8-sig", newline="") as handle:
            for row in csv.DictReader(handle):
                if row.get("TransactionID") == str(raw["TransactionID"]):
                    if identity is not None:
                        return unavailable("duplicate_identity")
                    identity = row
        features = with_identity(features, identity)
        X = csr_matrix(prep.transform(_array([{"features": features}], np)), dtype=float)
        if X.shape != (1, manifest["transformed_feature_count"]):
            return unavailable("schema_mismatch")
        score = float(model.predict_proba(X)[0, list(model.classes_).index(1)])
        if not math.isfinite(score) or not 0 <= score <= 1:
            return unavailable("invalid_probability")
        positive = score >= THRESHOLD
        return {"available": True, "mode": "shadow", "model_name": "XGBoost",
                "model_version": manifest["model_version"], "feature_schema_version": CORE_VERSION,
                "fraud_score": score, "threshold": THRESHOLD,
                "prediction": "fraud" if positive else "cleared",
                "risk_level": "above_model_threshold" if positive else "below_model_threshold",
                "error": None}
    except FileNotFoundError:
        return unavailable("artifact_or_identity_missing")
    except ValueError as exc:
        code = str(exc)
        return unavailable(code if code in {"schema_mismatch", "environment_mismatch", "artifact_integrity_error"} else "inference_failed")
    except Exception:
        return unavailable("inference_failed")


def main():
    try:
        result = predict_transaction(json.load(sys.stdin))
    except Exception:
        result = unavailable("inference_failed")
    print(json.dumps(result, allow_nan=False))


if __name__ == "__main__":
    main()
