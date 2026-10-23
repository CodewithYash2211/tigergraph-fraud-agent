"""Phase 3 offline experiment: python -B -m ml.train. No production imports."""
import csv
import importlib.metadata
import json
import math
from pathlib import Path
import platform
import warnings
import numpy as np
from scipy.sparse import csr_matrix
from sklearn.exceptions import ConvergenceWarning
from .preprocessing import load_core_dataset, make_preprocessor, _array, fingerprint
from .features import CORE_COLUMNS, CORE_CATEGORICAL
from .splits import build_splits
from .training import model_candidates, train_select, SELECTION_RULE, SEED
from .evaluation import probabilities, metrics, THRESHOLD_RULE

ROOT = Path(__file__).resolve().parent


def write_json(path, value):
    path.write_text(json.dumps(value, indent=2, sort_keys=True, allow_nan=False), encoding="utf-8")


def configuration_json(value):
    """Serialize estimator configuration, including XGBoost's NaN sentinel."""
    if isinstance(value, dict):
        return {key: configuration_json(item) for key, item in value.items()}
    if isinstance(value, (list, tuple)):
        return [configuration_json(item) for item in value]
    if isinstance(value, float) and not math.isfinite(value):
        return str(value)
    if isinstance(value, type):
        return value.__name__
    return value


def write_predictions(path, rows, p, threshold):
    with path.open("w", newline="", encoding="utf-8") as handle:
        writer = csv.writer(handle)
        writer.writerow(["transaction_id", "source_case_id", "label", "probability", "threshold", "prediction"])
        for row, probability, prediction in zip(rows, p, threshold.predict(p)):
            writer.writerow([row["transaction_id"], row["source_case_id"], row["adjudicated_fraud"],
                             float(probability), threshold.value, int(prediction)])


def main():
    results, reports = ROOT / "results", ROOT / "reports"
    results.mkdir(exist_ok=True)
    reports.mkdir(exist_ok=True)
    # Protect the frozen October evaluation from accidental repeated runs.
    if (results / "selection.json").exists():
        raise RuntimeError("Existing frozen selection found; refusing to overwrite/re-evaluate this experiment.")
    dataset = load_core_dataset()
    split = build_splits(dataset.records)
    parts = split["partitions"]
    prep = make_preprocessor()
    X_train = csr_matrix(prep.fit_transform(_array(parts["train"], np)), dtype=float)
    X_validation = csr_matrix(prep.transform(_array(parts["validation"], np)), dtype=float)
    y_train = np.array([r["adjudicated_fraud"] for r in parts["train"]])
    y_validation = np.array([r["adjudicated_fraud"] for r in parts["validation"]])
    try:
        import xgboost
        xgb_version = xgboost.__version__
    except ImportError:
        xgb_version = None
    candidates = model_candidates(include_xgboost=xgb_version is not None)
    with warnings.catch_warnings(record=True) as caught:
        warnings.simplefilter("always", ConvergenceWarning)
        winner, comparison, fitted = train_select(X_train, y_train, X_validation, y_validation, candidates)
    warning_text = [str(w.message) for w in caught]
    if any(issubclass(w.category, ConvergenceWarning) for w in caught):
        raise RuntimeError("Training convergence failed; October has not been evaluated: " + "; ".join(warning_text))
    chosen = fitted[winner]
    # Selection is written before even transforming October or constructing its y.
    selection = {"model": winner, "threshold": chosen["threshold"].value,
                 "threshold_rule": THRESHOLD_RULE, "selection_rule": SELECTION_RULE,
                 "selection_partition": "validation", "seed": SEED}
    write_json(results / "selection.json", selection)
    write_json(results / "validation_metrics.json", comparison)
    for name, fitted_model in fitted.items():
        write_predictions(results / (name + "_validation_predictions.csv"), parts["validation"],
                          fitted_model["probabilities"], fitted_model["threshold"])
    # Sole final test evaluation: winner only, no refitting or threshold adjustment.
    X_test = csr_matrix(prep.transform(_array(parts["test"], np)), dtype=float)
    y_test = np.array([r["adjudicated_fraud"] for r in parts["test"]])
    p_test = probabilities(chosen["model"], X_test)
    test_metrics = metrics(y_test, p_test, chosen["threshold"])
    write_json(results / "test_metrics.json", {"model": winner, **test_metrics})
    write_predictions(results / "october_predictions.csv", parts["test"], p_test, chosen["threshold"])
    numeric = prep.named_transformers_["numeric"]
    encoder = prep.named_transformers_["categorical"].named_steps["encode"]
    metadata = {
        "versions": {name: importlib.metadata.version(name) for name in ("numpy", "scipy", "scikit-learn")},
        "python": platform.python_version(), "xgboost": xgb_version, "warnings": warning_text,
        "models": {name: model.get_params() for name, model in candidates.items()},
        "feature_names": prep.get_feature_names_out(list(CORE_COLUMNS)).tolist(),
        "raw_features": list(CORE_COLUMNS), "preprocessor_fit_partition": "train",
        "shapes": {"train": list(X_train.shape), "validation": list(X_validation.shape), "test": list(X_test.shape)},
        "numeric_medians": numeric.named_steps["impute"].statistics_.tolist(),
        "numeric_means": numeric.named_steps["scale"].mean_.tolist(),
        "numeric_scales": numeric.named_steps["scale"].scale_.tolist(),
        "categories": {name: values.tolist() for name, values in zip(
            CORE_CATEGORICAL, encoder.categories_)},
        "encoder_configuration": encoder.get_params(), "split_audit": split["audit"],
        "source_audit": dataset.audit,
        "partition_sha256": {name: fingerprint(rows) for name, rows in parts.items()},
        "binary_artifacts_saved": False,
    }
    # get_params includes dtype classes: represent those deterministically.
    metadata = configuration_json(metadata)
    write_json(results / "configuration.json", metadata)
    lines = ["# Phase 3 supervised experiment", "", "Selected: **" + winner + "**.", "",
             "Threshold rule: " + THRESHOLD_RULE + ".", "Model rule: " + SELECTION_RULE + ".", "",
             "## September validation", "", "| Model | Threshold | Precision | Recall | F1 | Balanced accuracy | ROC-AUC | AP | Alert rate |",
             "|---|---:|---:|---:|---:|---:|---:|---:|---:|"]
    for name, m in comparison.items():
        lines.append("| " + name + " | " + " | ".join(f"{m[k]:.6f}" for k in
            ("threshold", "precision", "recall", "f1", "balanced_accuracy", "roc_auc", "average_precision", "alert_rate")) + " |")
    lines.extend(["", "## Frozen October result", "", "```json", json.dumps(test_metrics, indent=2), "```", "",
        "## Limits", "", "Dataset-provided adjudications are a selected, fraud-heavy investigation sample. "
        "No population-wide performance or calibrated probability claim is justified. "
        "AP is average precision, not trapezoidal PR area. Models use fixed configurations; "
        "September is used both for threshold selection and comparison, so validation scores are optimistic. "
        "Only the selected model is evaluated on October, once, without retraining. "
        "No synthetic oversampling, agent integration, policy changes or binary model artifacts. "
        "Transaction-time identity availability and independent label provenance remain assumptions. "
        "Outputs preserve transaction and source case IDs for audit; keep prediction files local."])
    (reports / "model_comparison.md").write_text("\n".join(lines), encoding="utf-8")
    print(json.dumps({"selection": selection, "validation": comparison, "test": test_metrics,
                      "shapes": metadata["shapes"], "warnings": warning_text}, indent=2))


if __name__ == "__main__":
    main()
