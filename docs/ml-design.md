# Isolated ML dataset audit and core feature preparation

This offline package does not import the agent, contact TigerGraph, run an
investigation, load credentials, train models, or change the frontend/API.
It reads the repository-root `data/` CSVs, not the duplicate `backend/data/` files.
The audit command emits aggregate JSON to stdout and writes no artifacts.

## Commands

From the repository root in PowerShell:

```powershell
Set-Location backend
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p 'test_ml_*.py' -v
.\.venv\Scripts\python.exe -B -m ml.splits
```

The audit accepts `--transactions` and `--history` overrides. Integrity failures
exit nonzero instead of silently dropping bad joins. Phase 1 requires only the
standard library; `requirements-ml.txt` intentionally installs nothing.

## Labels and joins

Split each historical `txn_ids` field on `|` and join exact string IDs to
`TransactionID`. Map only explicit `confirmed_fraud` to 1 and `cleared` to 0.
Unknown historical outcomes are errors; transactions without a case link are
unlabeled and excluded, never assigned zero. A shared customer/card/device/email
does not transmit a label. No risk score is used for labeling.

Preserve `source_case_id`, `label_source`, `label_known_at` and `closed_at` as audit
metadata. Validate unique case IDs, nonempty links/customers, duplicate links,
conflicting labels, unique transaction IDs, exact customer agreement, timestamps,
closure after or at transaction time, and existence of every linked transaction.
These are dataset-provided adjudications; their independent real-world provenance
still needs confirmation. Generated case JSON and graph investigation records
are not label sources. The 20-case trigger pack has no supervised outcomes.

## Feature boundary

Each record has a separate `features` dictionary. Only that dictionary is a future
model input; never pass the entire record to an estimator. It contains amount,
distances, product, channel, card brand/category and email domains. Missing values
remain missing. No imputation/scaling/encoding is fitted in this phase.

The explicit allowlist excludes risk_score, case outcome/pattern, transaction lists,
first_fraud_txn_id, actions, notes, reports, closure metadata, identifiers, and all
agent outputs. It also defers masked C/D/M/V features, identity joins and graph
features pending prediction-time provenance review. All future fitted transforms
must learn from training data only. Existing graph analytics are unchanged and
must be audited for point-in-time correctness before being used for training.

## Temporal protocol

All windows are half-open, in the source dataset's naive timestamp convention:

| Partition | Transaction window | Labels known strictly before |
|---|---|---|
| Train | 2016-07-01 to 2016-09-01 | 2016-09-01 |
| Validation | 2016-09-01 to 2016-10-01 | 2016-10-01 |
| Test | 2016-10-01 to 2016-11-01 | 2016-11-07 |

The fixed November 7 evaluation cutoff allows October outcomes to mature through
November 6. It does not allow their use in training or feature construction.
Timezone-aware inputs are rejected until a time-conversion convention is defined.

If a case's linked transactions occupy more than one window (including outside
the configured windows), purge the entire case. This check precedes maturity
filtering, so removing one immature row cannot hide a cross-boundary episode.
Then exclude out-of-window transactions and labels not mature at their cutoff.
Exclusions have one deterministic primary reason, in that order.

Each labeled transaction is accounted for exactly once across train, validation,
test, or **excluded**. Forcing all labels into the three model partitions would
violate the requested maturity/boundary safeguards. Excluded records retain their
metadata and reason in the returned object. No transaction/case moves to a later
partition merely to retain it. Customers may recur across time: this is an existing
customer temporal evaluation, not an unseen-customer evaluation.

## Audit and limits

Output includes total/labeled/unlabeled counts, positive/negative counts, source
date ranges, per-partition class counts/date ranges/cutoffs, exclusions by reason,
and total accounted labels. Full transaction data is streamed; only IDs and labeled
records are retained. Original CSVs are opened read-only.

Verified source audit: 590,742 transactions; 14,955 labeled (14,055 fraud,
900 cleared); 575,787 unlabeled. Transaction dates span July 2–December 31, 2016;
labeled transaction dates span July 2–October 31. Historical closure dates span
July 4–November 6. No linked ID, duplicate-link, conflicting-label or customer
integrity failure was found.

| Partition | Total | Fraud | Cleared | Observed transaction dates (2016) |
|---|---:|---:|---:|---|
| Train | 6,371 | 5,733 | 638 | July 2–August 30 |
| Validation | 2,836 | 2,730 | 106 | September 1–29 |
| Test | 3,207 | 3,065 | 142 | October 1–31 |

Excluded: 2,541 labeled transactions, comprising 1,462 case-boundary exclusions
and 1,079 immature labels. All 14,955 labeled transactions are accounted for.
These are observed audit results, never hardcoded into the preparation logic.

The historical sample is strongly selected toward fraud. Its metrics will not
estimate general-population fraud performance. This phase does not compute model
metrics or select a threshold. Label provenance, representative negatives, feature
provenance and model evaluation remain later work. No agent integration is enabled.

## Phase 2: core-v1 feature engineering

Phase 1's default loader, audit and temporal split rules are preserved. Phase 2
uses `load_core_dataset()` to opt into extended feature extraction and a one-to-one
left join of identity snapshots by TransactionID. Duplicate/empty identity IDs
fail validation. Unmatched transactions remain, in their original order. No labels
are created from the identity file. Only DeviceType/DeviceInfo are selected;
anonymous id_* fields have no adequate local meaning/availability documentation
and are excluded. C/D/M/V features and graph features remain excluded.

There are **19 core features** plus **6 fixed missingness indicators**, giving
25 inputs before categorical expansion:

| Group | Fields | Interpretation |
|---|---|---|
| Numeric | TransactionAmt, dist1, dist2 | Snapshot measurements; finite numeric conversion |
| Time | hour, weekday | Derived from ts; Monday=0; source naive time, no timezone inference |
| Categorical | ProductCD, channel | Transaction product and channel |
| Categorical card/address codes | card1–card6, addr1, addr2 | Strings, never ordered numerical measurements |
| Categorical email | P_emaildomain, R_emaildomain | Domains only |
| Categorical device | DeviceType, DeviceInfo | The transaction's identity snapshot |
| Missingness | TransactionAmt_missing, dist1_missing, dist2_missing, DeviceType_missing, DeviceInfo_missing, identity_missing | Fixed 0/1 columns; identity absence differs from present-but-empty fields |

Availability contract: these values must represent the transaction-time snapshot,
not later enrichment. The CSVs have no independent capture timestamp for device or
distance fields, so historical availability cannot be proven from the files alone.
This implementation uses the requested snapshot interpretation and computes no
future aggregates. Confirm that contract with the dataset provider before claiming
production point-in-time validity. Anonymous card codes can memorize entities;
an unseen-customer evaluation remains separate future work.

All closure metadata, outcomes, risk_score, pattern, transaction lists, actions,
notes, SAR/report fields and agent outputs remain excluded. Raw transaction/customer/
case IDs are carried only as alignment/audit metadata. An exact input schema check
rejects extra columns before transformation, and ColumnTransformer drops remainders.

### Training-only transformation

`prepare_features(records)` calls the existing `build_splits()` itself. It fits
one ColumnTransformer on **train only**, then calls transform on validation/test.
It never fits an estimator or does a random split. Empty training data fails;
empty evaluation partitions retain a zero-row matrix with the fitted feature width.

- Five numeric columns: training median imputation, then StandardScaler. Entirely
  missing training columns are retained with sklearn's documented zero fallback;
  missingness flags distinguish missing source measurements from observed zero.
- Fourteen categorical columns: missing-value sentinel, OneHotEncoder with
  min_frequency=5, max_categories=32 per column and handle_unknown=infrequent_if_exist.
  Unknowns use the fitted infrequent bucket when present; otherwise their column
  group is all-zero. Observed strings are prefixed so they cannot collide with the
  missing-value sentinel. No target encoding is used.
- Six fixed missingness flags pass through unchanged. They do not depend on which
  values happen to be missing in train, validation or test.
- Outputs are float CSR matrices with stable row order and separately aligned
  transaction IDs, labels and source case IDs. The transformed width is learned
  from training categories; the configured maximum is 459 columns (5 + 14*32 + 6).

See official [OneHotEncoder](https://scikit-learn.org/stable/modules/generated/sklearn.preprocessing.OneHotEncoder.html)
and [SimpleImputer](https://scikit-learn.org/stable/modules/generated/sklearn.impute.SimpleImputer.html)
documentation for rare/unknown categories and all-missing column handling.

Metadata includes core schema version, ordered input/output feature names and
counts, shapes, exact Python/library versions, configuration, fitted medians/means/
scales, training vocabularies/infrequent groups, temporal audit, and SHA-256 digests
of ordered partition features/IDs/labels/provenance. No timestamps or random values
are added to transformation metadata, allowing deterministic comparisons on the
same inputs/library versions. No files are written by the CLI.

### Running and dependency limitation

From backend:

```powershell
.\.venv\Scripts\python.exe -B -m ml.preprocessing --audit-only
.\.venv\Scripts\python.exe -B -m ml.preprocessing
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -p 'test_ml_*.py' -v
```

The raw audit uses only the standard library. Full transformation requires the
optional dependencies declared in requirements-ml.txt; pandas is not needed.
No dependencies were installed in the backend environment. Without them, the full
command fails clearly and sklearn-dependent tests explicitly skip. A raw-only
audit returns null for transformed count rather than fabricating an encoded width.
The final transformed count/shapes and seven transformation tests remain unverified
until these dependencies are available in a separately approved ML environment.

## Phase 3: validation-selected supervised models

Run `python -B -m ml.train` in the separate ML environment. The experiment uses
the unchanged core-v1 features and temporal splits. It fits the Phase 2
ColumnTransformer on July–August only, transforms September, and compares fixed
configurations: majority baseline, unweighted/balanced Logistic Regression,
unweighted/balanced Random Forest, and optional XGBoost. Seed 42 and single-threaded
tree estimators control repeatability. No synthetic oversampling or hyperparameter
search is performed. Configuration and exact dependency versions are recorded.

For each model, choose the threshold maximizing September balanced accuracy
(mean fraud recall and cleared recall). This objective avoids making the fraud-heavy
sample's majority class the sole focus. Threshold ties prefer the value closest
to 0.5, then the lower value. Model ties use Average Precision, then model name.
AP is Average Precision, not trapezoidal PR area. September supports both selection
steps, so its scores are selection-biased; no population-wide claims are made.

The winner and threshold are saved in `ml/results/selection.json` before October
is transformed or scored. Only the winning model is evaluated on October, without
refitting. Existing selection output blocks accidental repeat execution. October
is used for final reporting only, never configuration/threshold selection.

Results include validation metrics for every candidate, the winner's final test
metrics, confusion matrices, class prevalence/alert rates, row-level predictions
with transaction and source case IDs, preprocessing statistics/categories, feature
names, configurations and ordered partition hashes. Generated results stay local
under ignored `ml/results/`; the readable report is `ml/reports/model_comparison.md`.
No binary models are saved, avoiding pickle-loading and large-artifact concerns.
The configuration, code, source data and environment support reproduction; any
future experiment must explicitly preserve this frozen test result.

## Phase 4: shadow-only integration

The original Phase 3 process exited without saving a fitted model. The user
explicitly authorized one deterministic reconstruction/export, despite the initial
no-retraining constraint. `python -B -m ml.export` in .venv-ml checks the frozen
training/validation hashes, configuration, environment and feature names, fits only
July–August, then reproduces the saved September predictions at absolute tolerance
1e-7. It does not select a model/threshold or evaluate October. Existing artifacts
cannot be overwritten by the exporter.

Ignored `ml/artifacts/xgboost-core-v1/` contains native XGBoost `model.ubj`, a local
trusted `preprocessor.joblib`, and `manifest.json`. The manifest records schema,
245-feature width, exact dependency versions, SHA-256 hashes, export timestamp,
training version, protocol and frozen threshold 0.8961541056632996. The original
training date was not recorded and is explicitly null. This is a reconstructed
Phase 3 artifact, not a claim to have recovered the original process memory.

Joblib deserialization is restricted to this trusted local artifact directory;
never load uploaded/downloaded pickles. Hashes detect corruption but do not
authenticate an attacker-controlled manifest. Do not allow untrusted writes there.
The manifest and environment are checked before deserialization. No artifact is
committed automatically.

`tools/ml.py` uses the production interpreter's standard library to invoke
`.venv-ml/Scripts/python.exe -B -m ml.shadow` with a 45-second timeout. The production
environment gains no ML dependencies. Single-transaction extraction uses the exact
core-v1 schema and identity CSV left join. Unknown artifacts, incompatible schemas,
missing environment/data and inference failures yield available=false with null
score/prediction/risk level and sanitized error codes. No score is invented or
replaced with zero; stderr/exception details are never returned to the client.

The investigation calls scoring after evidence gathering and before assessment.
Its output is a separate `ml_prediction` state field, returned through the existing
POST /investigate result and preserved in local case JSON. It is deliberately not
added to the policy evidence list or grounded assessment context. Dataset risk_score,
fraud_probability, evidence_count, uncertainty, actions and approvals remain under
the existing logic. There is no frontend change. Model risk_level means only
above_model_threshold or below_model_threshold; it is not an agent risk verdict.
`prediction=cleared` is a classifier output, not an adjudication or permission to
clear a real case. Model scores are not calibrated population fraud probabilities.

Operational limitation: process startup and identity lookup add latency. Any worker
failure leaves the existing investigation intact; no ML result is used to improve
or change policy decisions in this phase. Backend tests run in .venv and ML tests
in .venv-ml, preserving separate dependency sets.
