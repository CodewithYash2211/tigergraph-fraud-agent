# TigerGraph Fraud Investigation

Agentic AI Fraud Investigation and Next-Best Action System using TigerGraph.

Frontend and demo experience for the TigerGraph × Hacker House Goa fraud investigation hackathon (HHGOA).

## Frontend

The frontend provides a simulated investigation experience for:

- Human verification and typed CAPTCHA
- Demo authentication and role selection
- Analyst investigation workspace
- Customer account and security workspace
- Investigation graph and connected entities
- Evidence and investigation findings
- Fraud patterns
- Case management
- Next Best Action recommendations
- Before/after evidence decisions
- SAR-related investigation views
- Policy and case memory views
- Replay of investigation decisions

Investigation Studio runs the existing Python backend through `POST /api/investigate/`, which forwards to `POST /investigate`. Its result panels use the actual response. Other demo pages, authentication, customer interactions and approvals remain simulated; no real financial or customer action is executed.

## Run locally

```bash
npm install
npm run dev
## Live Investigation Studio

Start the existing Python backend on `http://127.0.0.1:8000`, then:

```powershell
npm run build
npm start -- --hostname 127.0.0.1 --port 3000
```

For development use `npm run dev`. This app now requires the Next.js server;
static `out/` hosting cannot execute its existing POST proxy.
Set server-side `BACKEND_URL` to override the default backend address.
No TigerGraph credentials belong in the frontend.

Complete the demo sign-in, choose Analyst, then Cases → HHG-001 → Open in studio
→ Run investigation. Browser Network should show one POST to `/api/investigate/`
with `case_id: HHG-001` and `flagged_txn_id: 3514030`; the Next.js server forwards
that request to the backend. Failed POSTs are surfaced without automatic retries.
Cached results are from successful live requests only in Studio.

`npm test` runs seven focused request/mapping tests. `npm run build` includes
TypeScript validation. The supplied project has a `lint` script but no ESLint
configuration; `npm run lint` prompts for setup rather than completing a lint run.

Live validation on 2026-09-24 returned probability 0.61, exposure 77.07 and
CREATE_CASE/auto. The running backend reported graph queries unavailable (HTTP
500), and did not report persistence or sufficiency. The UI displays those gaps;
it does not substitute the earlier benchmark or demo results. The browser UI
flow was exercised, but the automation browser did not expose its Network panel.
