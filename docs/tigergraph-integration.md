# TigerGraph integration

The synchronous LangGraph investigation calls four existing installed queries in
`HHGOA_Fraud` through pyTigerGraph 2.0.4. No GSQL is installed or changed.

## Configuration

Set these variables in the process that launches Python:

| Variable | Meaning |
| --- | --- |
| `TIGERGRAPH_BASE_URL` | HTTP(S) cluster origin; optional `/restpp` suffix; no credentials in the URL |
| `TIGERGRAPH_GRAPH` | Defaults to `HHGOA_Fraud` |
| `TIGERGRAPH_TIMEOUT` | Positive timeout in seconds, defaults to 60 |
| `TIGERGRAPH_TOKEN` | Existing API token; takes precedence |
| `TIGERGRAPH_SECRET` | Optional alternative: let pyTigerGraph mint a token |
| `TIGERGRAPH_USERNAME`, `TIGERGRAPH_PASSWORD` | Optional alternative: let pyTigerGraph authenticate with database credentials |

`.env.example` documents the variables; it is not automatically loaded. The
application reads the environment and does not save credentials. `.env` files,
`.tg_token`, virtual environments, and Python caches are ignored by Git.

For a local token already stored in the ignored repository-root `.tg_token`,
the user can load it into the current PowerShell process without displaying it:

```powershell
$env:TIGERGRAPH_TOKEN = (Get-Content .tg_token -Raw).Trim()
```

Set the host and other variables in that same process before launching Python.
Setting variables in an unrelated terminal does not update an already-running
Codex or Python process. The application itself does not read `.tg_token`.

The client verifies TLS, disallows redirects, bounds HTTP calls including token
requests, and bounds query execution through the SDK's millisecond timeout.
The small `_do_request` override relies on the pinned SDK version and is covered
by mocked HTTP tests. An explicit token is never silently replaced. SDK/server
exception messages are not exposed because they can echo credentials.

## Observed query contracts

The fixture `backend/tests/fixtures/tigergraph_3514030.json` contains actual SDK
results captured from the live service before the mappings were written.
pyTigerGraph returns the REST response's **results list**, not its whole HTTP
envelope. Each list contains dictionaries keyed by the printed accumulator name.

| Installed query | Actual keys |
| --- | --- |
| `investigate_transaction` | `@@customers`, `@@cards`, `@@devices`, `@@emails`, `@@regions`, `@@related_txns` (lists of string IDs) |
| `risk_pattern_summary` | `@@related_count`, `@@high_risk_count`, `@@medium_high_risk_count`, `@@online_count`, `@@small_amount_count`, `@@total_amount`, `@@max_amount` (numbers) |
| `detect_fraud_patterns` | `@@small_online`, `@@online_total`, `@@small_online_amount`, `@@high_risk`, `@@medium_high_risk`, `@@largest_amount` (numbers) |
| `transaction_velocity` | `@@within_1h`, `@@within_6h`, `@@within_24h`, `@@amount_1h`, `@@amount_6h`, `@@amount_24h` (numbers) |

The current integration uses `risk_pattern_summary`, as requested, rather than
the earlier proposed `fraud_pattern_assessment` query.

`get_connected_entities()` preserves its existing public keys and adds
`pattern_assessment`, `velocity`, `fraud_pattern_signals`, `query_provenance`,
`raw_query_results`, and `status`. Provenance includes graph, query, transaction,
UTC request timestamps, the mapping, and any safe error information. Successful
SDK result lists are retained verbatim, including unexpected fields.

Missing required fields, conflicting duplicate fields, or invalid types fail
that query's normalization instead of creating zero values. Queries succeed
independently: status is `complete` for four valid results, `partial` for one to
three, and `unavailable` for none. Missing configuration is explicitly `not_run`.
Empty numeric sections mean unavailable evidence, not evidence of no fraud.
Empty result lists cannot establish whether a transaction exists; no not-found
signal is invented. Unrecognized output fields are retained only in raw results.

## Workflow semantics

The graph transport, query mappings, and policy rules are unchanged. The MVP
now loads case triggers, retrieves prior cases, grounds assessment in the collected
evidence, and uses a bounded evidence step before final policy evaluation.
See `docs/hhgoa-mvp.md` for current behavior, local/graph persistence, SAR drafts,
and benchmark commands.

Graph outputs remain available in `evidence` and the `graph_*` state fields.
Related IDs stay in `related_txn_ids`, not confirmed `affected_txn_ids`. Related
amounts are not substituted for fraud exposure, and aggregate counts alone do
not establish card testing. Evidence counting now counts source-backed signals.

For `3514030`, graph card ID `21139` and case-pack card ID `C12382-K1` remain
separate. No equivalence or graph relationship is invented.

## Validation

Offline tests require no credentials or live TigerGraph:

```powershell
cd backend
.venv/Scripts/python.exe -B -m unittest discover -s tests -v
```

They cover real captured result parsing, benchmark metrics, malformed/missing
fields, partial/unavailable results, HTTP and application errors, bounded
timeouts, credential-safe errors, and the compiled LangGraph workflow with
mocked transaction retrieval and graph query results.

The historical pre-MVP live validation report is `docs/tigergraph_3514030_validation.json`. It was
generated from a real workflow invocation with the actual CSV case/transaction
and all four live queries. Credentials are loaded into the invocation's process
environment only; they are not included in the report or fixture.

Expected benchmark summary: 421 related, 5 high-risk, 8 medium/high-risk, 2 online,
12 small-amount, total related amount 48706.58, maximum 845.01. Velocity counts
are 0/3/5 within 1/6/24 hours, with 315.89 related amount within 6 hours.
The live response additionally provides 0.00 within 1 hour and 404.02 within
24 hours, and zero small-online transactions/amount.

The expected workflow baseline remains probability 0.61, verdict `medium_risk`,
exposure 77.07, customer response `UNKNOWN`, and `CREATE_CASE` routed `auto` in
both policy stages. Related volume is never substituted for exposure.
