"""Explicitly authorized frozen Phase 3 reconstruction; no tuning/test evaluation."""
import csv
from datetime import datetime, timezone
import importlib.metadata
import json
from pathlib import Path
from uuid import uuid4
import joblib
import numpy as np
from scipy.sparse import csr_matrix

from .features import CORE_COLUMNS, CORE_VERSION
from .preprocessing import load_core_dataset, make_preprocessor, _array, fingerprint
from .splits import build_splits
from .training import model_candidates
from .train import configuration_json
from .shadow import ARTIFACT_DIR, MODEL_VERSION, THRESHOLD, digest


def main():
    root = Path(__file__).resolve().parent
    if ARTIFACT_DIR.exists():
        raise RuntimeError("Versioned artifact already exists; refusing replacement")
    config = json.loads((root / "results/configuration.json").read_text())
    selection = json.loads((root / "results/selection.json").read_text())
    if selection["model"] != "xgboost" or selection["threshold"] != THRESHOLD:
        raise RuntimeError("Frozen selection mismatch")
    versions = {name: importlib.metadata.version(name) for name in ("numpy", "scipy", "scikit-learn", "xgboost", "joblib")}
    for name, version in config["versions"].items():
        if versions[name] != version:
            raise RuntimeError("Frozen environment mismatch")
    if versions["xgboost"] != config["xgboost"]:
        raise RuntimeError("Frozen XGBoost mismatch")
    dataset = load_core_dataset()
    parts = build_splits(dataset.records)["partitions"]
    for name in ("train", "validation"):
        if fingerprint(parts[name]) != config["partition_sha256"][name]:
            raise RuntimeError("Frozen partition mismatch")
    prep = make_preprocessor()
    X = csr_matrix(prep.fit_transform(_array(parts["train"], np)), dtype=float)
    if prep.get_feature_names_out(list(CORE_COLUMNS)).tolist() != config["feature_names"]:
        raise RuntimeError("Frozen feature mismatch")
    model = model_candidates()["xgboost"]
    if configuration_json(model.get_params()) != config["models"]["xgboost"]:
        raise RuntimeError("Frozen model configuration mismatch")
    model.fit(X, np.array([r["adjudicated_fraud"] for r in parts["train"]]))
    validation = csr_matrix(prep.transform(_array(parts["validation"], np)), dtype=float)
    predictions = model.predict_proba(validation)[:, 1]
    with (root / "results/xgboost_validation_predictions.csv").open(newline="") as handle:
        expected = list(csv.DictReader(handle))
    if [r["transaction_id"] for r in expected] != [r["transaction_id"] for r in parts["validation"]]:
        raise RuntimeError("Validation row alignment mismatch")
    np.testing.assert_allclose(predictions, [float(r["probability"]) for r in expected], rtol=0, atol=1e-7)
    ARTIFACT_DIR.parent.mkdir(exist_ok=True)
    stage = ARTIFACT_DIR.parent / ("export-" + uuid4().hex)
    stage.mkdir()
    model.save_model(stage / "model.ubj")
    joblib.dump(prep, stage / "preprocessor.joblib")
    manifest = {
        "model_name": "XGBoost", "model_version": MODEL_VERSION,
        "feature_schema_version": CORE_VERSION, "feature_names": list(CORE_COLUMNS),
        "transformed_feature_count": X.shape[1], "threshold": THRESHOLD,
        "versions": versions, "exported_at": datetime.now(timezone.utc).isoformat(),
        "original_training_date": None, "training_version": "phase3-seed42-july-august-2016",
        "protocol_reference": "docs/ml-design.md#phase-3-validation-selected-supervised-models",
        "export_method": "Authorized frozen reconstruction; no new selection or October evaluation",
        "training_sha256": config["partition_sha256"]["train"],
        "validation_reproduction": {"rows": len(expected), "absolute_tolerance": 1e-7, "passed": True},
        "sha256": {name: digest(stage / name) for name in ("model.ubj", "preprocessor.joblib")},
    }
    (stage / "manifest.json").write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    stage.rename(ARTIFACT_DIR)
    print(json.dumps({"artifact": str(ARTIFACT_DIR), "validation_reproduced": len(expected),
                      "feature_count": X.shape[1], "model_version": MODEL_VERSION}))


if __name__ == "__main__":
    main()
