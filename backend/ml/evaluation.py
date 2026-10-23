"""Validation-only threshold selection and frozen classification metrics."""
from dataclasses import dataclass
import numpy as np
from sklearn.metrics import (average_precision_score, balanced_accuracy_score,
                             confusion_matrix, precision_score, recall_score,
                             f1_score, roc_auc_score, roc_curve)

THRESHOLD_RULE = "maximize validation balanced accuracy; ties closest to 0.5, then lower threshold"


def probabilities(model, X):
    classes = list(model.classes_)
    result = np.asarray(model.predict_proba(X)[:, classes.index(1)], dtype=float)
    if result.shape != (X.shape[0],) or not np.isfinite(result).all() or ((result < 0) | (result > 1)).any():
        raise ValueError("Invalid fraud probabilities")
    return result


@dataclass(frozen=True)
class FrozenThreshold:
    value: float

    def predict(self, probabilities):
        return (np.asarray(probabilities) >= self.value).astype(int)


def select_threshold(y_validation, p_validation):
    if set(np.unique(y_validation)) != {0, 1}:
        raise ValueError("Validation requires both adjudicated classes")
    fpr, tpr, thresholds = roc_curve(y_validation, p_validation, drop_intermediate=False)
    # ROC thresholds implement p >= threshold; retain every attainable decision.
    thresholds = np.where(np.isinf(thresholds), np.nextafter(1.0, 2.0), thresholds)
    scores = (tpr + 1 - fpr) / 2
    best = np.flatnonzero(np.isclose(scores, scores.max(), rtol=0, atol=1e-12))
    index = min(best, key=lambda i: (abs(thresholds[i] - 0.5), thresholds[i]))
    return FrozenThreshold(float(thresholds[index]))


def metrics(y, p, threshold):
    y = np.asarray(y, dtype=int)
    predicted = threshold.predict(p)
    both = len(np.unique(y)) == 2
    return {
        "count": len(y), "fraud_count": int(y.sum()), "cleared_count": int((y == 0).sum()),
        "fraud_prevalence": float(y.mean()), "threshold": threshold.value,
        "precision": float(precision_score(y, predicted, zero_division=0)),
        "recall": float(recall_score(y, predicted, zero_division=0)),
        "f1": float(f1_score(y, predicted, zero_division=0)),
        "balanced_accuracy": float(balanced_accuracy_score(y, predicted)),
        "roc_auc": float(roc_auc_score(y, p)) if both else None,
        "average_precision": float(average_precision_score(y, p)) if both else None,
        "alert_rate": float(predicted.mean()),
        "confusion_matrix": confusion_matrix(y, predicted, labels=[0, 1]).tolist(),
        "confusion_matrix_order": "rows=true [cleared,fraud]; columns=predicted [cleared,fraud]",
    }
