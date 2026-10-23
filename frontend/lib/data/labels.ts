import type { ActionCode, CaseStatusCode, PatternCode, Route, TriggerType, Verdict } from "./types";

export const PATTERN_LABEL: Record<PatternCode, string> = {
  card_testing: "Card testing",
  card_not_present_fraud: "Card-not-present fraud",
  card_not_present_new_device: "Card-not-present, new device",
  out_of_region_use: "Out-of-region use",
  account_takeover: "Account takeover",
  undocumented: "Undocumented pattern",
  none: "No fraud pattern",
  unknown: "Unknown / uncertain",
};
export const STATUS_LABEL: Record<CaseStatusCode, string> = {
  open: "Open", closed_fraud: "Closed, fraud", closed_legitimate: "Closed, legitimate", escalated: "Escalated",
};
export const VERDICT_LABEL: Record<Verdict, string> = { fraud: "Fraud", legitimate: "Legitimate", uncertain: "Uncertain" };
export const TRIGGER_LABEL: Record<TriggerType, string> = {
  risk_score: "Bank model alert", customer_report: "Customer report", analyst_request: "Analyst request",
};
export const ROUTE_LABEL: Record<Route, string> = { auto: "auto, agent may act", L1: "L1, team lead", L2: "L2, fraud manager" };
export const ACTION_LABEL: Record<ActionCode, string> = {
  ALLOW_TRANSACTION: "Allow transaction", DECLINE_TRANSACTION: "Decline transaction", MONITOR_CARD: "Monitor card",
  MONITOR_CONNECTED_CARDS: "Monitor connected cards", WARN_CUSTOMER: "Warn customer", VERIFY_WITH_CUSTOMER: "Verify with customer",
  STEP_UP_AUTH: "Step-up authentication", BLOCK_CARD: "Block card", BLOCK_ALL_CARDS: "Block all cards",
  GENERATE_REPORT: "Generate report", CREATE_CASE: "Create case", FILE_REPORT: "File report (SAR)",
  ESCALATE_TO_ANALYST: "Escalate to analyst", CLOSE_NO_FRAUD: "Close, no fraud",
};
export const money = (n: number | null | undefined) =>
  n === null || n === undefined ? "Amount pending" : n.toLocaleString("en-US", { style: "currency", currency: "USD" });
export const pct = (p: number | null | undefined) => (p === null || p === undefined ? "–" : `${Math.round(p * 100)}%`);
