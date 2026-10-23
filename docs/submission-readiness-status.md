# Submission readiness checkpoint — 2026-09-24

## Current phase: 2, blocked on workspace endpoint

All four installed queries were called against the configured TigerGraph host.
Each returned HTTP 500 with the actual cloud response:
“Failed to start workspace — Auto start is not enabled for this workspace.”
A subsequent check after the user reported Running/Ready returned the same page.
This failure occurs before installed GSQL execution. No queries or schema were changed.
The exact Host/REST URL from the Running workspace connection details is needed.
Do not send credentials in chat.

The API on port 8000 also served an older workflow lacking assessment and
persistence fields. Two stale Uvicorn listeners (0.0.0.0 and 127.0.0.1) and their
verified parents were stopped. The current repository backend now serves
127.0.0.1:8000 using the existing token in memory. Its controlled missing-case
validation was verified (404 case_not_found). No financial actions were executed.

## Changes this checkpoint

- backend/tools/tigergraph_client.py: recognize the observed stopped-workspace
  HTML error and return a static actionable message, never raw response text.
- backend/tests/test_tigergraph_client.py: regression for error classification
  and suppression of potentially sensitive response content.
- This status document.

## Validation

66 backend unit tests passed:

```powershell
cd D:\agentic-fraud-investigation\tigergraph-fraud-agent\backend
.venv/Scripts/python.exe -B -m unittest discover -s tests -q
```

Artifacts: cases/phase2-query-validation.json and cases/phase2-existing-api.json.
The latter captures the old server response before restart. The first contains
query failures and must not be represented as a successful acceptance run.

## Next actions, in order

1. Confirm the live workspace Host/REST URL and retry one installed query.
2. Validate all four queries and HHG-001 through the restarted API; verify its
   ClosedCase persistence and read-back hash.
3. Only after acceptance passes, rerun the existing live 20-case benchmark and
   read back every case. Existing benchmark files are prior-run artifacts,
   not evidence of a new run in this checkpoint.
4. Validate HHG-001, HHG-010, HHG-014 and another case in the frontend, including
   memory/evidence/decision/replay pages. Preserve completed demo-removal work.
5. Run frontend tests and build with frontend server stopped; finalize docs and
   repository hygiene. Frontend is a separate directory without Git metadata.

## Known submission gaps to audit

MCP is an integration boundary/documentation only, not a connected MCP transport.
Grounding is deterministic, not vector retrieval or LLM reasoning. Evidence
responses are explicitly simulated-unavailable. Approval routes and SAR drafts
are recommendations/artifacts, not executed actions or external filings.

Git branch: backend-agent. No commits or pushes performed. A tracked Python
cache file was already modified before this task. Some dataset CSVs are already
tracked despite ignore entries; datasets were not modified or deleted. Review
tracking before submission. No secret values are included in these artifacts.
