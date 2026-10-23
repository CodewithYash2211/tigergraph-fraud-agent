# Phase 3 supervised experiment

Selected: **xgboost**.

Threshold rule: maximize validation balanced accuracy; ties closest to 0.5, then lower threshold.
Model rule: maximum validation balanced accuracy, then average precision, then model name.

## September validation

| Model | Threshold | Precision | Recall | F1 | Balanced accuracy | ROC-AUC | AP | Alert rate |
|---|---:|---:|---:|---:|---:|---:|---:|---:|
| majority | 1.000000 | 0.962623 | 1.000000 | 0.980956 | 0.500000 | 0.500000 | 0.962623 | 1.000000 |
| logistic_unweighted | 0.946869 | 0.991120 | 0.735897 | 0.844650 | 0.783043 | 0.841496 | 0.992474 | 0.714739 |
| forest_unweighted | 0.921718 | 0.994522 | 0.731502 | 0.842972 | 0.813864 | 0.855536 | 0.993203 | 0.708039 |
| logistic_balanced | 0.779477 | 0.993289 | 0.704762 | 0.824513 | 0.791060 | 0.843147 | 0.992447 | 0.683004 |
| forest_balanced | 0.747734 | 0.995818 | 0.697802 | 0.820590 | 0.811165 | 0.854613 | 0.993505 | 0.674542 |
| xgboost | 0.896154 | 0.994353 | 0.838462 | 0.909777 | 0.857910 | 0.915531 | 0.996374 | 0.811707 |

## Frozen October result

```json
{
  "count": 3207,
  "fraud_count": 3065,
  "cleared_count": 142,
  "fraud_prevalence": 0.9557218584346742,
  "threshold": 0.8961541056632996,
  "precision": 0.9917168674698795,
  "recall": 0.8593800978792823,
  "f1": 0.9208180388044048,
  "balanced_accuracy": 0.8522252602072468,
  "roc_auc": 0.9219688440594629,
  "average_precision": 0.9958643159120648,
  "alert_rate": 0.8281883380106018,
  "confusion_matrix": [
    [
      120,
      22
    ],
    [
      431,
      2634
    ]
  ],
  "confusion_matrix_order": "rows=true [cleared,fraud]; columns=predicted [cleared,fraud]"
}
```

## Limits

Dataset-provided adjudications are a selected, fraud-heavy investigation sample. No population-wide performance or calibrated probability claim is justified. AP is average precision, not trapezoidal PR area. Models use fixed configurations; September is used both for threshold selection and comparison, so validation scores are optimistic. Only the selected model is evaluated on October, once, without retraining. No synthetic oversampling, agent integration, policy changes or binary model artifacts. Transaction-time identity availability and independent label provenance remain assumptions. Outputs preserve transaction and source case IDs for audit; keep prediction files local.