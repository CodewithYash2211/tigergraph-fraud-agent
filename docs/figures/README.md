# College report figures

Ten report figures, each supplied as editable **SVG** and high-resolution **PNG**.
All use a white background and a consistent engineering-report style. SVG is the
preferred scalable print format; PNG files are rendered at 2× dimensions (2,880 px
wide). No screenshots, UI mockups, model experiments or new measurements were
generated. `../college-project-report.md` was not modified.

Paths below are relative to the repository root unless noted. The frontend is the
sibling `../tigergraph-fraud-frontend/tg/` project. `preview-sheet.png` is a browsing
contact sheet, not an additional evidence figure or a screenshot.

| Figure (SVG / PNG) | Evidence represented | Source |
|---|---|---|
| [system-architecture.svg](system-architecture.svg) / [PNG](system-architecture.png) | Offline ML development, runtime API/workflow, isolated shadow worker and persistence. Shadow output only enters state/UI/local audit, never policy. | `backend/agent/workflow.py`, `backend/main.py`, `backend/tools/ml.py`, `backend/ml/train.py`, `backend/ml/export.py`, frontend `app/api/investigate/route.ts` |
| [ml-pipeline.svg](ml-pipeline.svg) / [PNG](ml-pipeline.png) | Explicit labels, temporal safeguards, training-only preprocessing, September selection, frozen October evaluation and later artifact export. | `backend/ml/dataset.py`, `splits.py`, `preprocessing.py`, `training.py`, `evaluation.py`, `train.py`, `export.py` |
| [agent-workflow.svg](agent-workflow.svg) / [PNG](agent-workflow.png) | Actual bounded orchestration, conditional request, simulated-unavailable response, reassessment and stopping after at most two assessments. | `backend/agent/workflow.py`: `investigate`, `evidence_route`, `simulate_response`, `build_workflow` |
| [tigergraph-architecture.svg](tigergraph-architecture.svg) / [PNG](tigergraph-architecture.png) | Verified schema relationships, other observed entity concepts and four installed queries. This is a limited schematic, not a full graph schema. | `backend/tests/fixtures/closedcase_schema.json`, `backend/tools/graph.py`, `backend/tools/graph_persistence.py`, `docs/tigergraph-integration.md` |
| [ml-model-comparison.svg](ml-model-comparison.svg) / [PNG](ml-model-comparison.png) | September balanced-accuracy bar chart plus precision/recall/F1/ROC-AUC/AP table. All values read from saved metrics. | `backend/ml/results/validation_metrics.json`, `selection.json` |
| [october-confusion-matrix.svg](october-confusion-matrix.svg) / [PNG](october-confusion-matrix.png) | Frozen October XGBoost matrix: TN=120, FP=22, FN=431, TP=2634; n=3,207; exact threshold included. | `backend/ml/results/test_metrics.json`, `selection.json` |
| [temporal-split.svg](temporal-split.svg) / [PNG](temporal-split.png) | Half-open transaction windows, label-maturity cutoffs, retained counts and 2,541 labeled exclusions. | `backend/ml/config.py`, `splits.py`, `backend/ml/results/configuration.json` (`split_audit`) |
| [feature-engineering.svg](feature-engineering.svg) / [PNG](feature-engineering.png) | 19 core variables + 6 missingness indicators = 25 inputs; training-fitted preprocessing yields 245 outputs. | `backend/ml/features.py`, `preprocessing.py`, `backend/ml/results/configuration.json` |
| [shadow-mode.svg](shadow-mode.svg) / [PNG](shadow-mode.png) | Recorded HHG-001 scores and CREATE_CASE action; separate display paths; no ML-to-policy arrow. | `cases/HHG-001.json`, `backend/tools/ml.py`, `backend/agent/workflow.py`, `backend/tests/test_shadow_integration.py` |
| [results-summary.svg](results-summary.svg) / [PNG](results-summary.png) | XGBoost validation and October metrics with explicit selected-sample/prevalence limitations. | `backend/ml/results/validation_metrics.json`, `test_metrics.json`, `selection.json` |

## Interpretation safeguards

- The confirmed schema edges shown are **undirected**: ClosedCase–INVOLVES–Transaction,
  ClosedCase–ON_CARD–Card and ClosedCase–CONNECTED_TO–Card. CONNECTED_TO is shown
  as schema evidence only; current persistence code selects verified INVOLVES and
  ON_CARD targets. No other relationship types or edge directions are invented.
- Customer, DeviceProfile, EmailDomain and BillingRegion are shown as observed
  concepts with their relationships unspecified. The figure does not claim the
  captured ClosedCase-only schema fixture exports all those vertex definitions.
- Graph transport is the existing pyTigerGraph SDK. MCP remains a documented
  integration boundary. Grounding is deterministic, not embedding/vector retrieval.
- The shadow call precedes assessment in workflow control, but its **score** is
  excluded from assessment/policy inputs. Dashed architecture/shadow paths indicate
  artifact or display/audit data, not policy control. Graph evidence is not an
  XGBoost input in this version.
- Artifact export occurred later through an explicitly authorized deterministic
  reconstruction. It did not rerun October evaluation. The ML pipeline figure
  describes chronology, not an October-to-training data dependency.
- Validation supplied both threshold selection and model comparison; October was
  untouched for tuning/model selection and used for the final frozen evaluation.
  AP is Average Precision, not trapezoidal PR area. Scores are not calibrated
  probabilities. The fraud-heavy sample is not representative population prevalence.
- Shadow values are taken from the saved HHG-001 case snapshot (updated
  `2026-10-01T06:29:58.050500+00:00`), not newly collected live evidence. Read-back,
  UI, graph and terminal screenshots remain separate items on the report checklist.

## Reproducible rendering

`generate_figures.py` is a standard-library-only diagram/chart source. It reads
saved JSON and writes only SVGs in this directory. It does not import model code,
call APIs, fit preprocessors, train models or compute new evaluation results.

From the repository root:

```powershell
.\backend\.venv\Scripts\python.exe -B docs/figures/generate_figures.py
node docs/figures/render_figures.cjs <path-to-an-existing-sharp-module>
```

`render_figures.cjs` uses an already available Sharp renderer; no packages were
installed in either project environment. Editable SVG files are the diagram source;
Mermaid is not required. Numeric chart labels preserve requested precision from
saved values. Review the rendered output after any regeneration or source change.

The PNGs were visually checked through a contact sheet. The architecture routing
was adjusted to avoid an artifact arrow crossing the API proxy box. The diagrams
are derived engineering figures, not fabricated application screenshots.
