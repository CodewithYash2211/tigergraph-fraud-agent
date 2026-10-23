# College AIML Project Documentation Outline

Prepared: 1 October 2026 (Asia/Calcutta). Documentation plan based on current source,
saved results and the user's confirmed live/visual acceptance. No experiments,
live queries, training or tests were rerun for this outline.

## Evidence conventions and report assembly plan

Repository root **R**: `D:/agentic-fraud-investigation/tigergraph-fraud-agent/`.
Frontend root **F**: `D:/agentic-fraud-investigation/tigergraph-fraud-frontend/tg/`.
Every `R/...` or `F/...` below is an exact location relative to these roots.
The frontend is a separate sibling project. Model artifacts/results may be
Git-ignored but are present locally; preserve an approved sanitized evidence copy
when assembling the college submission. Do not include secrets or environment files.

Evidence priority: implementation and saved experiment outputs; dated live case
records; previously recorded test results; user-confirmed visual acceptance.
Screenshots and signed/team claims still require their own evidence. A test source
file proves coverage exists, not that a particular run passed.

The current `R/cases/HHG-001.json`, updated `2026-10-01T06:29:58.050500+00:00`,
contains live graph completion, shadow inference and successful persistence.
September artifacts support earlier persistence/read-back and benchmark claims;
they do not establish a new 20-case shadow-mode benchmark. In particular, benchmark
results and read-back documents have different generation timestamps. Preserve
that distinction and reconcile run identity before presenting them as one run.
`R/docs/submission-readiness-status.md` contains an older blocked checkpoint;
`R/docs/hhgoa-mvp.md` also has a now-stale benchmark-pending sentence. Do not reuse
those statements as current status. This phase changes only this outline.

Assembly order: collect missing evidence listed below; produce the architecture
figure; populate methodology/results from saved JSON; add screenshots with case,
date and source captions; complete team details and verified references; review
every claim against its evidence. This is an outline, not a claim that the final
college report, screenshots or bibliography have already been produced.

## 1. Project Title

- **Implemented / proposed wording:** “Graph-Based Fraud Investigation with
  Leakage-Safe Machine Learning and Shadow-Mode Decision Support.” This describes
  the implemented graph investigation, supervised experiment and advisory score.
- **Evidence:** `R/backend/agent/workflow.py`, `R/backend/ml/train.py`,
  `R/backend/tools/ml.py`, `F/components/investigation/MLAssessment.tsx`.
- **Still needed:** College-approved title, department, course code, academic year,
  guide, team names and institutional cover-page format. No screenshot required.

## 2. Abstract

- **Implemented / planned content:** Summarize a FastAPI/LangGraph investigation
  workflow combining transaction data, TigerGraph evidence, historical cases and
  deterministic policy recommendations. Describe exact historical outcome labels,
  temporal evaluation, selected XGBoost and separate shadow inference. State that
  the score does not independently determine actions and that evaluation concerns
  a selected investigation sample. Use the October metrics in Section 17.
- **Evidence:** `R/backend/main.py`, `R/backend/agent/workflow.py`,
  `R/backend/ml/results/test_metrics.json`, `R/backend/tools/assessment.py`.
- **Still needed:** Abstract word limit and keywords; final abstract after figures
  and evidence are assembled. Do not claim real-world loss reduction.

## 3. Problem Statement

- **Implemented / planned content:** Investigate flagged transactions using
  connected evidence rather than interpreting a single score as a final verdict.
  Address missing transaction-level labels, leakage and auditable recommendations.
- **Evidence:** `R/backend/tools/triggers.py`, `R/backend/tools/transaction.py`,
  `R/backend/tools/graph.py`, `R/backend/ml/dataset.py`.
- **Still needed:** Approved academic problem statement and scope boundaries.
  A trigger screenshot may illustrate the input; no unsupported industry statistics.

## 4. Motivation

- **Implemented / planned content:** The project separates model scoring,
  relationship context and policy decisions, preserves evidence provenance, and
  prevents a new ML score from silently replacing the existing risk score.
- **Evidence:** `R/backend/tools/grounding.py`, `R/backend/tools/ml.py`,
  `R/backend/tests/test_shadow_integration.py`.
- **Still needed:** Team's actual motivation and any externally sourced literature
  supporting broader claims. Do not invent interviews, deployments or bank partners.

## 5. Objectives

- **Implemented:** Validate labels/joins; prevent temporal leakage; compare fixed
  supervised models; investigate using four graph queries; preserve uncertainty;
  recommend policy actions; persist cases; display shadow ML separately.
- **Evidence:** `R/backend/ml/dataset.py`, `splits.py`, `training.py` under the same
  `R/backend/ml/` directory; `R/backend/agent/workflow.py`;
  `R/backend/tools/graph_persistence.py`; `F/lib/api/backend.ts`.
- **Still needed:** Map each objective to the college rubric and an acceptance
  result. Treat future features separately rather than marking them complete.

## 6. Scope

- **Implemented:** CSV-backed research prototype, local API/frontend, hosted graph,
  deterministic bounded workflow and supervised evaluation on adjudicated historical
  cases. Approval routes and actions are recommendations; SARs are drafts.
- **Evidence:** `R/docs/hhgoa-mvp.md`, `R/backend/tools/artifacts.py`,
  `R/backend/ml/reports/model_comparison.md`.
- **Still needed:** Deployment assumptions and intended demonstrators/users.
  Explicit exclusions: autonomous banking actions, production calibration, live
  customer-response service, live MCP transport and vector retrieval.

## 7. Existing System

- **Implemented / baseline definition:** Describe the project's pre-ML graph and
  policy workflow using the dataset risk score, plus the majority classifier as
  the experimental baseline. This is not an audited description of an external bank.
- **Evidence:** `R/backend/tools/assessment.py`, `R/backend/tools/policy.py`,
  `R/backend/ml/training.py`, `R/backend/ml/results/validation_metrics.json`.
- **Still needed:** If the college requires a literature-based “existing systems”
  comparison, obtain actual publications and cite them separately.

## 8. Proposed System

- **Implemented:** Extend the existing investigation with an independently reported
  XGBoost score, a versioned artifact and an ML card, while retaining established
  assessment/policy semantics. The proposed system is now implemented in shadow mode.
- **Evidence:** `R/backend/tools/ml.py`, `R/backend/ml/shadow.py`,
  `R/backend/models/state.py`, `F/components/investigation/MLAssessment.tsx`.
- **Still needed:** Before/after screenshot of separate scores and unchanged action.
  Do not claim improved final decisions merely because another score is displayed.

## 9. System Architecture

- **Implemented:** Browser/Next.js client → existing Next API proxy → FastAPI
  `POST /investigate` → LangGraph workflow. Evidence comes from CSV lookup,
  pyTigerGraph queries and historical-case retrieval. A separate `.venv-ml` worker
  returns shadow inference. Deterministic assessment and policy produce the final
  recommendation; local JSON and ClosedCase persistence retain the investigation.
- **Evidence:** `F/app/api/investigate/route.ts`, `F/lib/api/backend.ts`,
  `R/backend/main.py`, `R/backend/agent/workflow.py`, `R/backend/tools/ml.py`,
  `R/backend/tools/artifacts.py`, `R/backend/tools/graph_persistence.py`.
- **Still needed:** One architecture figure showing runtime and offline training
  separately; label the ML arrow “shadow state/UI only” and show no ML-to-policy
  control arrow. Show SDK transport, not a functioning MCP service. Annotate local
  and hosted components without exposing host credentials.

## 10. Dataset Description

- **Implemented / measured:** 590,742 transactions; 144,432 identity records;
  5,565 historical cases; 20 trigger cases. Transactions span July–December 2016.
  The historical adjudications link 14,955 unique transactions. The inspected
  transaction schema has 397 columns, including V1–V339; no direct fraud target.
- **Evidence:** `R/data/transactions.csv`, `identity.csv`, `closed_cases_history.csv`,
  `case_pack.csv` under `R/data/`; `R/backend/ml/results/configuration.json`
  (`source_audit`). Runtime/ML paths select root `data/`, not `backend/data/` copies.
- **Still needed:** Dataset provider, original citation, license, provenance of
  historical outcomes and feature dictionary. Do not infer a dataset source from
  column names alone. Use a redacted schema/sample, not a bulk data appendix.

## 11. Data Preparation

- **Implemented:** Stream CSVs; validate required columns, unique IDs and exact
  historical links; preserve source case and label-known time; retain unlabeled
  counts. Identity is a one-to-one left join; unmatched transactions remain.
  There are 8,404 labeled identity matches and 6,551 labeled rows without identity.
- **Evidence:** `R/backend/ml/dataset.py`, `R/backend/ml/preprocessing.py`,
  `R/backend/ml/results/configuration.json` (`source_audit`).
- **Still needed:** Data-preparation flow figure and sanitized audit output with
  source path/version caption. No CSV edits or resampling to illustrate this section.

## 12. Label Generation

- **Implemented:** Extract `txn_ids` by `|`; map explicit `confirmed_fraud` to 1 and
  `cleared` to 0. There are 14,055 fraud and 900 cleared transaction labels;
  575,787 transactions remain unlabeled and excluded from supervised training.
  Duplicate/conflicting links and customer mismatches fail validation.
- **Evidence:** `R/backend/ml/config.py`, `R/backend/ml/dataset.py`,
  `R/backend/tests/test_ml_dataset.py`, `R/data/closed_cases_history.csv`.
- **Still needed:** A sanitized example tracing one case to its explicit transaction
  labels, and independent label provenance. Explain that “generation” means
  extraction of adjudications, not inference from risk_score or shared entities.

## 13. Leakage Prevention

- **Implemented:** July–August train, September validation, October test. Labels
  must be known before September 1, October 1 and November 7 respectively. Whole
  cases crossing partition boundaries are excluded. No random split or label
  propagation. Excluded: 1,462 boundary rows and 1,079 immature labels; total 2,541.
  Preprocessing learns only from train; model/threshold selection uses September.
- **Evidence:** `R/backend/ml/splits.py`, `R/backend/ml/preprocessing.py`,
  `R/backend/ml/train.py`, `R/backend/tests/test_ml_splits.py`,
  `R/backend/ml/results/selection.json`.
- **Still needed:** Temporal split diagram showing transaction and label-maturity
  windows. Clarify that customers may recur across time; this is not an
  unseen-customer test. Fixed snapshot availability remains a data-contract assumption.

## 14. Feature Engineering

- **Implemented:** 19 core variables: amount, distances, hour/weekday, product,
  channel, card1–card6, addr1/addr2, email domains and device type/info. Six fixed
  missingness flags yield 25 inputs and 245 transformed columns. Numeric median
  imputation/scaling and bounded unknown-safe categorical encoding are train-fitted.
  No risk_score, outcomes, closure fields, raw IDs, anonymous id_* or graph ML features.
- **Evidence:** `R/backend/ml/features.py`, `R/backend/ml/preprocessing.py`,
  `R/backend/ml/results/configuration.json` (`raw_features`, `feature_names`, `shapes`),
  `R/backend/tests/test_ml_features.py`.
- **Still needed:** Feature-group table and transformation diagram. Note that 245
  means encoded columns, not 245 independent raw measurements; document entirely
  missing-column handling and dataset snapshot assumptions.

## 15. ML Methodology

- **Implemented:** Majority baseline, Logistic Regression and Random Forest with
  unweighted/balanced variants, and XGBoost. Fixed configurations, seed 42, no
  synthetic oversampling. Training uses the same 6,371 rows for all models.
  Threshold maximizes validation balanced accuracy; ties prefer closest to 0.5,
  then lower threshold. Model ties use AP, then name. Only the winner receives
  the final October evaluation, without refitting to validation.
- **Evidence:** `R/backend/ml/training.py`, `evaluation.py`, `train.py` under
  `R/backend/ml/`; `R/backend/requirements-ml-phase3.txt`;
  `R/backend/ml/results/configuration.json` and `selection.json`.
- **Still needed:** Methodology pseudocode and rationale for balanced accuracy.
  State that validation is used twice (threshold and model selection), hence its
  metrics are optimistic selection results, not independent test estimates.

## 16. Model Comparison

- **Implemented / measured:** September results below are copied from saved metrics;
  all candidates use their own validation-selected threshold.

| Model | Precision | Recall | F1 | Balanced accuracy | ROC-AUC | AP |
|---|---:|---:|---:|---:|---:|---:|
| Majority | .9626 | 1.0000 | .9810 | .5000 | .5000 | .9626 |
| Logistic, unweighted | .9911 | .7359 | .8446 | .7830 | .8415 | .9925 |
| Logistic, balanced | .9933 | .7048 | .8245 | .7911 | .8431 | .9924 |
| Forest, unweighted | .9945 | .7315 | .8430 | .8139 | .8555 | .9932 |
| Forest, balanced | .9958 | .6978 | .8206 | .8112 | .8546 | .9935 |
| XGBoost | .9944 | .8385 | .9098 | .8579 | .9155 | .9964 |

- **Evidence:** `R/backend/ml/results/validation_metrics.json`,
  `R/backend/ml/reports/model_comparison.md`. Per-model validation prediction CSVs
  are in `R/backend/ml/results/` and preserve transaction/source case IDs.
- **Still needed:** Comparison chart/table screenshot with selection objective and
  prevalence caption. Explain why majority F1 exceeds XGBoost F1 while it has no
  cleared-class discrimination. Do not call XGBoost best on every metric.

## 17. XGBoost Evaluation

- **Implemented / measured:** Frozen threshold `0.8961541056632996`. October:
  precision .9917168675, recall .8593800979, F1 .9208180388, balanced accuracy
  .8522252602, ROC-AUC .9219688441, AP .9958643159, alert rate .8281883380.
  Confusion matrix `[[120,22],[431,2634]]`: rows actual cleared/fraud, columns
  predicted cleared/fraud. Thus TN=120, FP=22, FN=431, TP=2634.
- **Evidence:** `R/backend/ml/results/test_metrics.json`, `selection.json`,
  `october_predictions.csv` under `R/backend/ml/results/`.
- **Still needed:** Labeled confusion-matrix figure, optional ROC/PR figures
  generated from already saved predictions (not a new evaluation/tuning exercise),
  and limitations caption. AP is Average Precision, not trapezoidal PR area.
  XGBoost score is not a calibrated fraud probability.

## 18. TigerGraph Architecture

- **Implemented:** Existing `HHGOA_Fraud` graph accessed through pyTigerGraph
  `runInstalledQuery`. Connected entity outputs include cards, customers, devices,
  emails and regions. Existing ClosedCase schema supports case storage and
  schema-checked edges. No live MCP transport is connected.
- **Evidence:** `R/backend/tools/tigergraph_client.py`, `R/backend/config/tigergraph.py`,
  `R/backend/tests/fixtures/closedcase_schema.json`, `R/docs/tigergraph-mcp.md`.
- **Still needed:** Sanitized live graph schema/export and screenshot of actual
  vertex/edge types. `R/tigergraph/` currently contains no GSQL source files;
  do not invent the full schema/query implementation from Python output mappings.
  MCP is only the documented client-injection boundary.

## 19. Graph Investigation

- **Implemented:** Four installed queries: `investigate_transaction`,
  `risk_pattern_summary`, `detect_fraud_patterns`, `transaction_velocity`.
  Normalize evidence while preserving raw results, provenance and complete/partial/
  unavailable status. Current HHG-001 snapshot contains four completed queries
  and 421 related transactions. Related volume is not confirmed fraud exposure.
- **Evidence:** `R/backend/tools/graph.py`, `R/docs/tigergraph-integration.md`,
  `R/cases/HHG-001.json` (`graph_evidence`),
  `R/backend/tests/fixtures/tigergraph_3514030.json`.
- **Still needed:** Current query execution screenshot with txn ID and status,
  plus graph relationship view. Do not claim aggregates prove R5 card-testing's
  ordered sequence or that these aggregates were trained into XGBoost.

## 20. Agentic AI Workflow

- **Implemented:** Trigger → transaction/graph/history collection → shadow ML state
  → deterministic assessment → initial policy → conditional evidence request and
  reassessment → final policy → persistence. At most two assessment iterations.
  Preserve initial/final actions and an explicit stopping reason.
- **Evidence:** `R/backend/agent/workflow.py:build_workflow`,
  `R/backend/tools/assessment.py`, `R/backend/models/state.py`.
- **Still needed:** Node/edge workflow figure using actual node names and branch
  conditions. Describe agentic behavior as bounded tool orchestration; do not claim
  LLM-generated reasoning, autonomous learning or an unlimited planning loop.

## 21. Evidence Gathering

- **Implemented:** Structured transaction, graph, policy source, pattern guidance
  and historical evidence form deterministic GraphRAG-style grounding. Assessment
  distinguishes missing/conflicting evidence and counts corroborating signals.
  Customer requests are recorded; automated responses are explicitly
  `SIMULATED_UNAVAILABLE`, not real customer interaction.
- **Evidence:** `R/backend/tools/grounding.py`, `R/backend/tools/assessment.py`,
  `R/docs/fraud-patterns.json`, `R/backend/agent/workflow.py:simulate_response`;
  `F/app/(app)/intelligence/evidence/page.tsx`.
- **Still needed:** Evidence-panel screenshot and sanitized context excerpt showing
  provenance/uncertainty. State explicitly: no vector database, embeddings or
  semantic retrieval is implemented by this grounding layer.

## 22. Historical Case Memory

- **Implemented:** CSV retrieval matches exact transaction/card/customer identifiers,
  requires closure by investigation opening time, ranks matches and returns up to
  five cases with match reasons. Pattern alone does not establish a match.
- **Evidence:** `R/backend/tools/cases.py:find_similar_cases`,
  `R/data/closed_cases_history.csv`, `R/cases/HHG-001.json` (`historical_evidence`),
  `F/app/(app)/cases/memory/page.tsx`.
- **Still needed:** Memory screen showing an actual eligible historical match and
  its closure time. Clarify the distinction between backend historical CSV retrieval
  and frontend case-memory presentation; do not claim generated investigations are
  automatically adjudicated training labels or online learning inputs.

## 23. Policy / Next Best Action

- **Implemented:** Existing deterministic rules return actions, reasons and approval
  routes from the existing assessment/evidence. Current HHG-001 final action is
  `CREATE_CASE`, route `auto`. ML output is excluded from policy inputs.
- **Evidence:** `R/backend/tools/policy.py:evaluate_policy`,
  `R/backend/agent/workflow.py:initial_policy` and `final_policy`,
  `R/cases/HHG-001.json` (`final_actions`),
  `F/app/(app)/investigate/decision/page.tsx`.
- **Still needed:** Exact policy-rule table derived from code and decision screenshot.
  Do not imply recommendations execute bank blocks, payments or external reports;
  UI review controls are not proof of a production approval execution service.

## 24. ML Shadow Mode

- **Implemented:** Version `xgboost-core-v1-seed42`, schema `core-v1`. Separate ML
  interpreter loads a local XGBoost UBJ model and trusted joblib preprocessor after
  manifest/version/hash checks. The user-authorized frozen reconstruction reproduced
  2,836 September predictions within 1e-7 without October re-evaluation. API/local
  case JSON preserve `ml_prediction` separately; unavailable scores are null.
  HHG-001: dataset risk_score .61; XGBoost score .9814080595970154; threshold
  .8961541056632996; classifier prediction `fraud`; final action still CREATE_CASE.
- **Evidence:** `R/backend/ml/export.py`, `shadow.py` under `R/backend/ml/`;
  `R/backend/tools/ml.py`; `R/backend/ml/artifacts/xgboost-core-v1/manifest.json`,
  `model.ubj`, `preprocessor.joblib`; `R/cases/HHG-001.json`;
  `R/backend/tests/test_shadow_integration.py`.
- **Still needed:** Sanitized same-run API capture and score/action screenshot.
  Document trusted-local pickle constraints, worker timeout and latency, missing
  original training timestamp, and model score's uncalibrated interpretation.

## 25. Frontend / Investigation Studio

- **Implemented:** Existing client/proxy/adapter architecture displays a responsive
  ML card in Studio and Assessment. Fields: XGBoost fraud score, threshold,
  prediction, model/version, feature schema and separate existing risk score.
  Loading, no-data and sanitized unavailable/error states are supported. User
  confirms visual verification; earlier automated frontend verification passed.
- **Evidence:** `F/components/investigation/MLAssessment.tsx`,
  `F/lib/data/ml-assessment.ts`, `F/lib/api/backend.ts`,
  `F/app/(app)/investigate/page.tsx`,
  `F/app/(app)/investigate/assessment/page.tsx`,
  `F/tests/ml-assessment.test.cjs`.
- **Still needed:** Desktop/mobile screenshots and unavailable/loading captures;
  browser Network evidence of the existing POST path. No screenshot location was
  supplied for the user's visual acceptance. Do not substitute test values or old
  cached responses for a live demonstration.

## 26. Case Persistence

- **Implemented:** Local case JSON survives graph errors. Graph persistence inspects
  existing schema, uses an existing string field (observed `ClosedCase.outcome`)
  for tagged investigation JSON, and uses only verified compatible edges/targets.
  Reports success/uncertain/failed with sanitized diagnostics and payload hash.
  SAR generation writes a draft with `externally_filed=false` when policy requires it.
- **Evidence:** `R/backend/tools/artifacts.py`, `R/backend/tools/graph_persistence.py`,
  `R/cases/HHG-001.json`, `R/cases/HHG-001-persistence-acceptance.json`,
  `R/cases/benchmark_readback_verification.json`.
- **Still needed:** Current shadow-era write/read-back screenshot and matching hash.
  September read-back evidence is available but not proof of read-back of October's
  latest snapshot. Do not equate tagged investigation records with adjudicated
  closed fraud, or local shadow storage with every ML field being stored in graph.

## 27. Testing Strategy

- **Implemented / previously verified:** 72 backend/integration tests plus 45 ML
  tests = 117 passed; 15 frontend tests passed; TypeScript and production build
  passed. Tests cover joins, labels, temporal guards, preprocessing, model outputs,
  frozen thresholds, artifacts, fail-open shadow behavior, unchanged policy,
  query/persistence handling and card rendering. These were not rerun for this outline.
- **Evidence:** `R/backend/tests/test_*.py` (individual ML files use `test_ml_` prefix;
  shadow integration is `test_shadow_integration.py`),
  `F/tests/investigation.test.cjs`, `F/tests/ml-assessment.test.cjs`,
  `F/package.json`; prior recorded verification in this project conversation.
- **Still needed:** Dated terminal logs/screenshots of exact counts, commands,
  interpreter versions, TypeScript exit status and build result. Backend tests use
  `.venv`, ML tests `.venv-ml`; do not use an old all-tests command in the wrong
  environment. Stop the dev server before the frontend build.

## 28. Results

- **Implemented / measured:** Preserve separate predictive, integration and UI
  outcomes. Predictive split shapes: 6,371×245 / 2,836×245 / 3,207×245. Class counts:

| Partition | Fraud | Cleared | Fraud prevalence |
|---|---:|---:|---:|
| Train | 5,733 | 638 | 89.99% |
| Validation | 2,730 | 106 | 96.26% |
| Test | 3,065 | 142 | 95.57% |

  Current HHG-001 combines completed graph evidence, real shadow score, unchanged
  CREATE_CASE and successful persistence. September benchmark records report
  20 completed, zero failed, 20 graph-complete and 20 persistence successes; a
  separate read-back record reports 20 verified and 20 local cases preserved.
- **Evidence:** `R/backend/ml/results/configuration.json`, `test_metrics.json`,
  `R/cases/HHG-001.json`, `R/cases/benchmark_results.json`,
  `R/cases/benchmark_readback_verification.json`.
- **Still needed:** Results summary figure, source timestamps and benchmark-run
  reconciliation noted above. Do not treat 20 trigger cases as a labeled ML test,
  or claim the old benchmark validates every later shadow/frontend change.

## 29. Limitations

- **Implemented / observed limits:** Selected fraud-heavy labels; independently
  unverified adjudication provenance; unlabeled rows are not negatives; small
  cleared validation/test counts; shared customers can recur across partitions;
  identity timing is assumed; no calibration or population-wide claim. Graph
  analytics are not ML features. No live MCP, vector RAG, generative LLM reasoning,
  real customer verification, externally filed SAR or executed bank action.
  Local snapshots are not a complete event database. Worker startup/CSV scans add
  latency; trusted pickle loading requires protected local artifacts.
- **Evidence:** `R/docs/ml-design.md`, `R/docs/tigergraph-mcp.md`,
  `R/backend/tools/grounding.py`, `R/backend/agent/workflow.py`,
  `R/backend/tools/artifacts.py`, `R/backend/ml/shadow.py`.
- **Still needed:** Honest discussion of generalizability, security/deployment and
  optional measured latency. Do not invent confidence intervals or load-test results.

## 30. Future Scope

- **Implemented / boundary:** The implemented foundation supports later extensions;
  the following are proposals, not delivered capabilities: independently adjudicated
  representative labels, calibration, uncertainty estimates, unseen-customer tests,
  point-in-time graph ML features, real MCP transport, stronger artifact trust,
  durable case history and genuine customer/approval integrations.
- **Evidence:** Extension boundary `R/docs/tigergraph-mcp.md`;
  constraints and deferred features `R/docs/ml-design.md`;
  current code `R/backend/tools/ml.py` and `R/backend/tools/cases.py`.
- **Still needed:** Team prioritization and evaluation criteria. Policy promotion
  requires a separate validation/approval phase; do not promise automatic deployment.

## 31. Conclusion

- **Implemented / planned content:** Conclude that the project demonstrates a
  reproducible temporal ML experiment combined with graph-assisted, auditable
  investigation and policy-independent shadow inference. State XGBoost won the
  declared validation protocol, not every metric, and retain all scope limitations.
- **Evidence:** `R/backend/ml/results/selection.json`, `test_metrics.json`,
  `R/cases/HHG-001.json`, `R/backend/tests/test_shadow_integration.py`.
- **Still needed:** Final conclusion after all evidence is assembled; no claim of
  reduced fraud losses, improved real-world decisions or production readiness.

## 32. Team Contribution Placeholders

- **Implemented:** Work exists across backend/graph, datasets/ML, frontend, testing
  and documentation. This inspection does not establish individual authorship.
- **Evidence:** Relevant source locations throughout this outline; reviewed commit
  history/task records can later support attribution, but were not audited here.
- **Still needed:** Complete only with verified names/contributions:

| Member / ID | Verified responsibilities | Supporting files/tasks | Review/sign-off |
|---|---|---|---|
| [Member 1] | [To confirm] | [Evidence] | [Pending] |
| [Member 2] | [To confirm] | [Evidence] | [Pending] |
| [Member 3, if applicable] | [To confirm] | [Evidence] | [Pending] |

  Add guide/institution acknowledgements and AI-tool assistance disclosures required
  by college policy. Do not invent contributor counts, effort hours or ownership.

## 33. References Placeholder

- **Implemented:** Library versions/configuration and local methodology are recorded;
  existing documentation links selected official sources. A finished academic
  bibliography is not yet assembled.
- **Evidence:** `R/backend/requirements.txt`, `R/backend/requirements-ml-phase3.txt`,
  `R/backend/ml/results/configuration.json`, `R/docs/ml-design.md`,
  `R/docs/tigergraph-integration.md`, `F/package.json`.
- **Still needed:** Verify and format actual references for dataset/provider and
  license; TigerGraph/pyTigerGraph; LangGraph; FastAPI; scikit-learn preprocessing
  and metrics; XGBoost paper/documentation; Next.js/React; relevant fraud/leakage
  literature. Record authors, title, year, version, URL/DOI and access date. Include
  MCP only as a discussed boundary/future component, not a used transport. No
  unverified bibliographic entries or fabricated citations should be inserted.

## Final Evidence Needed Checklist

Keep a caption for each item: case/transaction where relevant, capture date,
software/model version, source path and whether live, historical or test fixture.
Redact credentials, authorization headers and unnecessary customer/device IDs.

- [ ] **Architecture screenshot/diagram:** actual Next proxy/FastAPI/LangGraph/SDK,
  CSV/history sources, separate ML worker and persistence; offline training branch;
  no ML-to-policy control arrow. Sources: Section 9.
- [ ] **ML model comparison:** render saved September metrics and objective;
  label AP/prevalence and explain majority F1. Sources: Section 16.
- [ ] **Confusion matrix:** October winner only, TN/FP/FN/TP labels, frozen threshold
  and 3,207-row denominator. Source: `R/backend/ml/results/test_metrics.json`.
- [ ] **Frontend ML assessment:** desktop/mobile captures showing live separate
  scores, model/schema and shadow notice; include loading/unavailable state.
  Source: Section 25. User confirmed visual acceptance; attach its evidence.
- [ ] **TigerGraph graph:** sanitized current schema/relationship screenshot plus
  four installed query names and HHG-001 complete status. Sources: Sections 18–19.
- [ ] **Evidence panel:** actual graph/transaction provenance and uncertainty;
  distinguish deterministic grounding from vector retrieval. Source: Section 21.
- [ ] **Historical case memory:** eligible prior case, match reason and temporal
  cutoff; avoid exposing unneeded personal details. Source: Section 22.
- [ ] **Final decision:** same investigation's CREATE_CASE and approval route beside
  separate .61 risk score and .9814080596 shadow score; no causal ML claim.
  Source: `R/cases/HHG-001.json` and decision UI.
- [ ] **Persistence/read-back:** current case vertex, selected text attribute,
  acknowledgement and payload/hash read-back matching the same snapshot. September
  proofs already exist; collect/reconcile shadow-era evidence before reusing them.
- [ ] **Test results:** dated logs for 72 backend + 45 ML tests, 15 frontend tests,
  TypeScript and production build; note separate environments and no dev/build overlap.
- [ ] **Dataset provenance and split audit:** provider/license, adjudication meaning,
  counts/exclusions and the exact temporal diagram; unresolved provenance remains a
  limitation rather than a filled-in claim.
- [ ] **Artifact and reproducibility record:** sanitized manifest/configuration,
  version/hash and authorized reconstruction note. Do not publish credentials or
  automatically include binary artifacts/prediction CSVs.
- [ ] **Team and references:** verified contribution table, college formatting,
  acknowledgements, real bibliography and required AI-assistance disclosure.

Completion criterion: all 33 sections can be written using identified sources,
with missing evidence explicitly marked until obtained. No feature work, model
changes, query changes or new performance claims are authorized by this outline.
