"""Offline core features and train-only sklearn transformations; no estimator.

From backend: python -B -m ml.preprocessing [--audit-only]
"""
import argparse
import csv
import hashlib
import json
import platform

from .config import TRANSACTIONS_PATH, HISTORY_PATH, IDENTITY_PATH
from .dataset import load_dataset, DatasetValidationError, _require_columns
from .features import (CORE_COLUMNS, CORE_NUMERIC, CORE_CATEGORICAL, CORE_INDICATORS,
                       CORE_VERSION, extract_core_features, with_identity)
from .splits import build_splits

MIN_FREQUENCY = 5
MAX_CATEGORIES = 32


class MLDependenciesUnavailable(RuntimeError):
    pass


def dependencies():
    try:
        import numpy as np
        import scipy
        import sklearn
    except ImportError as exc:
        raise MLDependenciesUnavailable(
            "Phase 2 transformation requires numpy, scipy and scikit-learn; "
            "see backend/requirements-ml.txt. No packages were installed."
        ) from exc
    return np, scipy, sklearn


def load_core_dataset(transactions_path=TRANSACTIONS_PATH, history_path=HISTORY_PATH,
                      identity_path=IDENTITY_PATH):
    with open(transactions_path, encoding="utf-8-sig", newline="") as handle:
        header = next(csv.reader(handle), [])
    _require_columns(header, ("ts", "TransactionAmt", "dist1", "dist2") + tuple(
        name for name in CORE_CATEGORICAL if name not in ("DeviceType", "DeviceInfo")
    ), "core transactions")
    dataset = load_dataset(transactions_path, history_path, feature_extractor=extract_core_features)
    by_id = {r["transaction_id"]: r for r in dataset.records}
    seen, matched = set(), 0
    with open(identity_path, encoding="utf-8-sig", newline="") as handle:
        reader = csv.DictReader(handle)
        _require_columns(reader.fieldnames, ("TransactionID", "DeviceType", "DeviceInfo"), "identity")
        if len(reader.fieldnames) != len(set(reader.fieldnames)):
            raise DatasetValidationError("Duplicate identity column names")
        for row in reader:
            if None in row or any(v is None for v in row.values()):
                raise DatasetValidationError("Malformed identity CSV row")
            txn_id = row["TransactionID"].strip()
            if not txn_id or txn_id in seen:
                raise DatasetValidationError("Empty or duplicate identity TransactionID")
            seen.add(txn_id)
            if txn_id in by_id:
                record = by_id[txn_id]
                record["features"] = with_identity(record["features"], row)
                matched += 1
    dataset.audit.update(identity_rows=len(seen), labeled_identity_matches=matched,
                         labeled_identity_missing=len(by_id) - matched)
    return dataset


def raw_rows(records):
    """Exact schema checks prevent accidental passthrough of identifiers/labels."""
    rows = []
    for record in records:
        features = record["features"]
        if set(features) != set(CORE_COLUMNS):
            raise DatasetValidationError("Core feature schema mismatch: unexpected or missing columns")
        rows.append([features[name] for name in CORE_COLUMNS])
    return rows


def make_preprocessor():
    dependencies()
    from sklearn.compose import ColumnTransformer
    from sklearn.pipeline import Pipeline
    from sklearn.impute import SimpleImputer
    from sklearn.preprocessing import OneHotEncoder, StandardScaler
    indices = lambda columns: [CORE_COLUMNS.index(name) for name in columns]
    numeric = Pipeline([
        ("impute", SimpleImputer(strategy="median", keep_empty_features=True)),
        ("scale", StandardScaler()),
    ])
    categorical = Pipeline([
        ("impute", SimpleImputer(strategy="constant", fill_value="__MISSING__", keep_empty_features=True)),
        ("encode", OneHotEncoder(handle_unknown="infrequent_if_exist", min_frequency=MIN_FREQUENCY,
                                 max_categories=MAX_CATEGORIES, sparse_output=True)),
    ])
    return ColumnTransformer([
        ("numeric", numeric, indices(CORE_NUMERIC)),
        ("categorical", categorical, indices(CORE_CATEGORICAL)),
        ("missingness", "passthrough", indices(CORE_INDICATORS)),
    ], remainder="drop", sparse_threshold=1.0)


def _array(records, np):
    values = raw_rows(records)
    # Prefix observed categories to avoid collision with the imputation sentinel.
    for row in values:
        for index, name in enumerate(CORE_COLUMNS):
            if row[index] is None:
                row[index] = np.nan
            elif name in CORE_CATEGORICAL:
                row[index] = "value:" + str(row[index])
    return np.asarray(values, dtype=object).reshape(len(values), len(CORE_COLUMNS))


def fingerprint(value):
    return hashlib.sha256(json.dumps(value, sort_keys=True, allow_nan=False).encode()).hexdigest()


def prepare_features(records):
    """Always rebuild the validated temporal split; only its train bucket is fitted."""
    np, scipy, sklearn = dependencies()
    split = build_splits(records)
    partitions = split["partitions"]
    if not partitions["train"]:
        raise DatasetValidationError("Training partition is empty")
    arrays = {name: _array(rows, np) for name, rows in partitions.items()}
    preprocessor = make_preprocessor()
    train = preprocessor.fit_transform(arrays["train"])
    matrices = {"train": scipy.sparse.csr_matrix(train, dtype=float)}
    for name in ("validation", "test"):
        matrices[name] = (scipy.sparse.csr_matrix(preprocessor.transform(arrays[name]), dtype=float)
                          if partitions[name] else scipy.sparse.csr_matrix((0, train.shape[1])))
    names = preprocessor.get_feature_names_out(list(CORE_COLUMNS)).tolist()
    numeric = preprocessor.named_transformers_["numeric"]
    encoder = preprocessor.named_transformers_["categorical"].named_steps["encode"]
    metadata = {
        "schema_version": CORE_VERSION, "raw_core_feature_count": len(CORE_NUMERIC) + len(CORE_CATEGORICAL),
        "missingness_feature_count": len(CORE_INDICATORS), "input_feature_count": len(CORE_COLUMNS),
        "input_feature_names": list(CORE_COLUMNS), "transformed_feature_count": len(names),
        "transformed_feature_names": names, "fit_partition": "train",
        "shapes": {name: list(matrix.shape) for name, matrix in matrices.items()},
        "versions": {"python": platform.python_version(), "numpy": np.__version__,
                     "scipy": scipy.__version__, "sklearn": sklearn.__version__},
        "configuration": {"min_frequency": MIN_FREQUENCY, "max_categories": MAX_CATEGORIES,
                          "unknown_categories": "infrequent_if_exist", "numeric_imputation": "median",
                          "all_missing_numeric_fallback": 0, "numeric_scaling": "StandardScaler",
                          "weekday": "Monday=0", "timestamp_convention": "source naive time"},
        "numeric_medians": numeric.named_steps["impute"].statistics_.tolist(),
        "numeric_means": numeric.named_steps["scale"].mean_.tolist(),
        "numeric_scales": numeric.named_steps["scale"].scale_.tolist(),
        "training_categories": {name: values.tolist() for name, values in zip(CORE_CATEGORICAL, encoder.categories_)},
        "infrequent_categories": {name: None if values is None else values.tolist()
                                  for name, values in zip(CORE_CATEGORICAL, encoder.infrequent_categories_)},
        "partition_input_sha256": {name: fingerprint([
            {"id": r["transaction_id"], "features": r["features"],
             "label": r["adjudicated_fraud"], "source_case_id": r["source_case_id"],
             "timestamp": r["timestamp"], "label_known_at": r["label_known_at"]} for r in rows
        ]) for name, rows in partitions.items()},
        "split_audit": split["audit"],
    }
    aligned = {name: {"transaction_ids": [r["transaction_id"] for r in rows],
                      "labels": [r["adjudicated_fraud"] for r in rows],
                      "source_case_ids": [r["source_case_id"] for r in rows]}
               for name, rows in partitions.items()}
    return {"preprocessor": preprocessor, "matrices": matrices, "aligned": aligned, "metadata": metadata}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--audit-only", action="store_true", help="Audit raw features without sklearn")
    args = parser.parse_args()
    try:
        if not args.audit_only:
            dependencies()  # Fail before reading the large CSV when unavailable.
        data = load_core_dataset()
        if args.audit_only:
            split = build_splits(data.records)
            report = {**data.audit, **split["audit"], "raw_core_feature_count": len(CORE_NUMERIC) + len(CORE_CATEGORICAL),
                      "missingness_feature_count": len(CORE_INDICATORS), "input_feature_count": len(CORE_COLUMNS),
                      "raw_shapes": {k: [len(raw_rows(v)), len(CORE_COLUMNS)] for k, v in split["partitions"].items()},
                      "transformed_feature_count": None, "status": "raw_audit_only"}
        else:
            report = prepare_features(data.records)["metadata"]
    except (DatasetValidationError, MLDependenciesUnavailable, OSError) as exc:
        parser.exit(1, f"Feature preparation unavailable: {exc}\n")
    print(json.dumps(report, indent=2, allow_nan=False))


if __name__ == "__main__":
    main()
