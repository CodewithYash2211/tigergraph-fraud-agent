import type { CaseStatus } from "../types";

/**
 * Investigation lifecycle metadata: the fixed steps every investigation moves
 * through. Captions describe the step generically; all case-specific content
 * comes from the live investigation state / backend answer.
 */
export const STAGES = [
  { key: "signal", label: "Case received", status: "New" as CaseStatus, caption: "A trigger opens the case: a bank model alert, a customer report or an analyst request." },
  { key: "relationships", label: "Graph expanded", status: "Investigating" as CaseStatus, caption: "The agent expands the flagged transaction's neighbourhood in TigerGraph." },
  { key: "evidence", label: "Prior cases found", status: "Evidence found" as CaseStatus, caption: "Case memory is searched for closed cases on the same customer, card or device profile." },
  { key: "pattern", label: "Pattern", status: "Pattern identified" as CaseStatus, caption: "The evidence is compared with the documented fraud patterns." },
  { key: "risk", label: "Assessment input", status: "Risk assessed" as CaseStatus, caption: "The backend assessment retains the transaction's existing risk_score; this is not a calibrated probability." },
  { key: "request", label: "Evidence request", status: "Awaiting evidence" as CaseStatus, caption: "The backend can record a request; no live customer channel is connected and unavailable replies remain explicit." },
  { key: "reassess", label: "Final assessment", status: "Recommendation ready" as CaseStatus, caption: "The final assessment and actions are those returned by the backend." },
  { key: "recommend", label: "Next best action", status: "Awaiting approval" as CaseStatus, caption: "The policy router proposes actions and the approval routes they need." },
  { key: "decision", label: "Case and SAR", status: "Reviewed" as CaseStatus, caption: "The interface records an analyst choice in this browser session; it does not update backend case memory." },
] as const;

export const LAST_STAGE = STAGES.length - 1;
