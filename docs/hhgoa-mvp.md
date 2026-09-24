# HHGOA backend MVP

## Run

From PowerShell:

```powershell
Set-Location "D:\agentic-fraud-investigation\tigergraph-fraud-agent\backend"
.\.venv\Scripts\python.exe -B -m unittest discover -s tests -v
.\.venv\Scripts\python.exe -B -m uvicorn main:app --host 127.0.0.1 --port 8000
```

`POST /investigate` still accepts `case_id` and `flagged_txn_id`, and returns
`{"status":"success","result": ...}`. Case IDs are loaded from the original
case pack; mismatches and missing transactions return controlled 422/404 errors.
Unexpected failures return a generic 500 without exception text.

The case-pack trigger fields are retained, including its original risk score.
The transaction model score is separately used in assessment. An explicit
customer denial in a case-pack report is source evidence, not a simulation.

## Assessment and grounding

`tools/grounding.py` constructs a deterministic GraphRAG-style context containing
transaction/trigger evidence, graph relationships, graph summary/pattern/velocity
metrics and query provenance, the actual policy function source, versioned
pattern guidance, relevant prior closed cases, and uncertainty. Assessment uses
this context. No LLM, vector database, or external retrieval service is added.

Evidence counting uses distinct source-backed signals, not three container
objects. Overlapping graph counts are counted once. Prior fraud is contextual
evidence only; it never classifies the current transaction by itself. Historical
cases must have closed by the case-pack opening time. Timestamps are interpreted
as the dataset's common naive time basis; no timezone offset is invented.

The dataset risk score is retained because graph aggregates have no calibrated
probability conversion. Graph/history information affects evidence sufficiency,
conflict detection and documented pattern hypotheses. The assessment returns
`sufficient`, `missing_evidence`, `conflicting_evidence`, `confidence`, and `reason`.
Pattern guidance in `docs/fraud-patterns.json` is conservative project guidance,
not a replacement for the unchanged policy engine.

Card testing is not asserted without the actual ordered timed sequence. Existing
queries do not prove that sequence or clearing status. Related amounts remain
separate from the flagged transaction's exposure. Graph and case-pack card IDs
are retained separately.

## Bounded evidence step

The first assessment and policy decision are preserved. If evidence is
insufficient and customer verification is applicable, a request is recorded.
The response is explicitly `SIMULATED_UNAVAILABLE`, `simulated=true`, and
`UNKNOWN`. The second assessment cannot treat that as new corroboration.
There are at most two assessments. Sufficient evidence, exhausted iterations,
or no applicable automated request produce explicit stop reasons.

## Local and graph persistence

Every successful investigation writes `cases/<case_id>.json`, with trigger,
transaction, graph/history evidence, grounded context, assessment, uncertainty,
request records, initial/final recommendations, approval routes, case status,
and timestamps. Atomic replacement preserves the prior complete file on a failed
write. Repeated runs keep `created_at` and update `updated_at`; this is a snapshot,
not a full event database. Actions remain recommendations, not executions.

If policy returns `FILE_REPORT`, `cases/sar/<case_id>.json` is a structured draft
with L2 approval routing and `externally_filed=false`. A subsequent run that no
longer requires a report replaces the old draft with a supersession marker.

After the local case is saved, `tools/graph_persistence.py` attempts a graph
upsert using the existing SDK connection. It inspects the live schema first and
requires an existing `ClosedCase` vertex with a STRING primary ID and an existing
STRING `evidence_summary`, `analyst_notes`, or `outcome` attribute (in that order).
The live schema uses `outcome`. No schema is created.

The selected text attribute stores an auditable JSON investigation record with
case/customer/card/flagged-transaction IDs, status, verdict/risk, pattern,
recommended actions, evidence summary, provenance, and uncertainty. Other exact
compatible attributes are populated only when present in the inspected schema.
The record is explicitly an investigation, not confirmed or closed fraud.
Existing `INVOLVES` and `ON_CARD` edges are used only when their schema and target
vertices are verified. Card edges use unambiguous graph card IDs, not case-pack IDs.
No relationship edges or target vertices are invented.

Graph-write status, timestamps, mapped attribute names, accepted vertex count,
and a payload hash are written back into the local JSON and API result. Schema
or authentication failure is `failed`; a transport failure after submitting an
upsert is `uncertain` because the remote outcome is unknown. Acknowledged writes
are `success`. Local output survives. Errors contain a stage, code, and safe
diagnostic message, never raw SDK exception text or response bodies. Benchmark
outputs carry `graph_persistence_error` separately from investigation `error`.
An unchanged case ID makes a repeated upsert idempotent at the vertex level.

HHG-001 live acceptance succeeded on 2026-09-24: one ClosedCase vertex plus
INVOLVES/ON_CARD writes were acknowledged. Read-back matched the full payload
SHA-256. See `cases/HHG-001-persistence-acceptance.json` for the schema and audit.
The full 20-case benchmark has not been rerun after this persistence fix.

## Benchmark

```powershell
# No credentials or graph access; real CSV data and real local workflow:
.\.venv\Scripts\python.exe -B -m benchmarks.run_cases --offline

# Live mode, run by the user with the existing environment configured:
.\.venv\Scripts\python.exe -B -m benchmarks.run_cases
```

The runner reads the 20 case-pack records, fetches their transactions in one
streaming pass, and invokes the same compiled agent per case. Errors are isolated
per case. It writes `cases/benchmark_results.json` and
`cases/benchmark_summary.csv`, plus successful case/SAR artifacts.

Offline mode never constructs a TigerGraph client. Graph evidence is unavailable
and persistence is `not_attempted`; it is not a substitute for a live benchmark.
Outputs include mode, graph evidence status, and graph persistence status so
offline execution is not presented as live success. Re-running replaces snapshots.

MCP is documented separately in `docs/tigergraph-mcp.md`; no live MCP connection
is claimed. The prior `tigergraph_3514030_validation.json` is the historical live
integration baseline, not a live validation of these new MVP additions.
