/** Policy and pattern reference, transcribed from the HHGOA README (Fraud Policy v1.0 and Known Fraud Patterns). */
import type { ActionCode, PatternCode, Route } from "../data/types";

export const PATTERNS: { code: PatternCode; name: string; signal: string; rules: string; documented: boolean }[] = [
  { code: "card_testing", name: "Card testing", documented: true, rules: "R5",
    signal: "Three or more tiny online authorisations, often under $5, then a larger purchase. Confirmed by the sequence itself." },
  { code: "card_not_present_fraud", name: "Card-not-present fraud", documented: true, rules: "R1–R4",
    signal: "Online use with amounts and products that don't fit the cardholder, often two to four within 48 hours. One unusual purchase alone is ambiguous: verify." },
  { code: "card_not_present_new_device", name: "Card-not-present, new device", documented: true, rules: "R1–R4",
    signal: "As above, with the identity record marking the device New for the account, sometimes behind a proxy. Stronger, still not proof: people buy new phones." },
  { code: "out_of_region_use", name: "Out-of-region use", documented: true, rules: "R2, R3",
    signal: "Card-present purchases in a billing region with no history while normal home activity continues. Several days in one new region is a trip, not a clone." },
  { code: "account_takeover", name: "Account takeover", documented: true, rules: "R2, R10",
    signal: "Mixed-channel activity inconsistent with the cardholder, often with device and match-flag anomalies. Points to stolen credentials." },
  { code: "undocumented", name: "Undocumented", documented: false, rules: "R9",
    signal: "Coordinated or repeated abuse that fits none of the five. Describe it in your own words; do not force it into a known category." },
];

export const POLICY_ACTIONS: { action: ActionCode; route: Route | "L1/L2"; does: string; impact: string }[] = [
  { action: "ALLOW_TRANSACTION", route: "auto", does: "Let the flagged transaction stand", impact: "None" },
  { action: "DECLINE_TRANSACTION", route: "L1", does: "Decline the flagged authorisation only", impact: "Low" },
  { action: "MONITOR_CARD", route: "auto", does: "Raise monitoring on this card for 72 hours", impact: "None" },
  { action: "MONITOR_CONNECTED_CARDS", route: "auto", does: "Monitor cards linked by device, region cluster or ring", impact: "None" },
  { action: "WARN_CUSTOMER", route: "auto", does: "Send an informational message", impact: "None" },
  { action: "VERIFY_WITH_CUSTOMER", route: "auto", does: "Ask the cardholder whether they made it", impact: "Low" },
  { action: "STEP_UP_AUTH", route: "auto", does: "Require a one-time passcode or app confirmation", impact: "Low" },
  { action: "BLOCK_CARD", route: "L1/L2", does: "Block and reissue. L1 up to $2,500 exposure, L2 above", impact: "High" },
  { action: "BLOCK_ALL_CARDS", route: "L2", does: "Block every card the customer holds", impact: "Very high" },
  { action: "GENERATE_REPORT", route: "auto", does: "Internal write-up without opening a case", impact: "None" },
  { action: "CREATE_CASE", route: "auto", does: "Open an internal case and write it to the graph", impact: "None" },
  { action: "FILE_REPORT", route: "L2", does: "File a suspicious activity report with the regulator", impact: "None" },
  { action: "ESCALATE_TO_ANALYST", route: "auto", does: "Hand the case to a human with the evidence", impact: "None" },
  { action: "CLOSE_NO_FRAUD", route: "auto", does: "Close the alert as legitimate", impact: "None" },
];

export const POLICY_RULES: { id: string; title: string; body: string; highlight?: boolean }[] = [
  { id: "R1", title: "Verify before blocking on a weak signal", body: "Single signal and fraud probability below 0.70: VERIFY_WITH_CUSTOMER or STEP_UP_AUTH before any block." },
  { id: "R2", title: "Customer denies", body: "BLOCK_CARD and CREATE_CASE. Add FILE_REPORT above $1,000 exposure or when linked to a shared device or another card's fraud." },
  { id: "R3", title: "Customer confirms", body: "CLOSE_NO_FRAUD and note the confirmation in the case." },
  { id: "R4", title: "No reply in 24 hours", body: "MONITOR_CARD and DECLINE_TRANSACTION for pending authorisations. Escalate above $500." },
  { id: "R5", title: "Card testing", body: "3+ small online authorisations within an hour, then a larger one: DECLINE_TRANSACTION and STEP_UP_AUTH. BLOCK_CARD if over $100 already cleared." },
  { id: "R6", title: "Shared origin", body: "Several cards with fraud from one device profile, region or recipient email: name it, CREATE_CASE, FILE_REPORT, MONITOR_CONNECTED_CARDS." },
  { id: "R7", title: "Disputed but legitimate", body: "Matches the customer's own recurring pattern: CREATE_CASE, VERIFY_WITH_CUSTOMER, WARN_CUSTOMER. Do not block." },
  { id: "R8", title: "Uncertain and exposed", body: "Verdict uncertain with exposure over $500, or conflicting evidence: ESCALATE_TO_ANALYST." },
  { id: "R9", title: "Undocumented patterns", body: "Coordinated or repeated abuse across customers that fits no known pattern: CREATE_CASE, FILE_REPORT, ESCALATE_TO_ANALYST, and describe it.", highlight: true },
  { id: "R10", title: "Never BLOCK_ALL_CARDS", body: "Unless at least two of the customer's cards show confirmed fraud, or their credentials are confirmed compromised.", highlight: true },
];
