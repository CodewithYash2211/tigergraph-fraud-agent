/** Types that mirror the HHGOA answer format (README "Answer Format") and the dataset files. */

export type TriggerType = "risk_score" | "customer_report" | "analyst_request";
export type CaseStatusCode = "open" | "closed_fraud" | "closed_legitimate" | "escalated";
export type Verdict = "fraud" | "legitimate" | "uncertain";
export type PatternCode =
  | "card_testing" | "card_not_present_fraud" | "card_not_present_new_device"
  | "out_of_region_use" | "account_takeover" | "undocumented" | "none" | "unknown";
export type ActionCode =
  | "ALLOW_TRANSACTION" | "DECLINE_TRANSACTION" | "MONITOR_CARD" | "MONITOR_CONNECTED_CARDS" | "WARN_CUSTOMER"
  | "VERIFY_WITH_CUSTOMER" | "STEP_UP_AUTH" | "BLOCK_CARD" | "BLOCK_ALL_CARDS" | "GENERATE_REPORT"
  | "CREATE_CASE" | "FILE_REPORT" | "ESCALATE_TO_ANALYST" | "CLOSE_NO_FRAUD";
export type Route = "auto" | "L1" | "L2";
export type EvidenceSourceCode = "graph" | "document" | "customer" | "external";

export interface DeviceRecord {
  profile: string;
  device_type: string | null;
  device_info: string | null;
  os: string | null;
  browser: string | null;
  screen: string | null;
  new_for_account: string | null; // id_15: New / Found
  proxy: string | null; // id_23
  match_status: string | null; // id_34
}

/** One row of case_pack.csv, enriched from identity.csv and closed_cases_history.csv by scripts/build_fixtures.py */
export interface CasePackCase {
  case_id: string;
  opened_at: string;
  trigger_type: TriggerType;
  trigger_text: string;
  flagged_txn_id: string;
  card_id: string;
  customer_id: string;
  risk_score: number | null;
  amount_usd: number | null;
  channel: "online" | "in_person" | null;
  billing_region: string | null;
  device: DeviceRecord | null;
  device_neighbour_count: number;
  device_neighbours_exam_window: string[];
  customer_closed_cases: string[];
  device_closed_cases: string[];
}

export interface ClosedCase {
  case_id: string;
  customer_id: string;
  card_id: string;
  opened_at: string;
  closed_at: string;
  outcome: "confirmed_fraud" | "cleared";
  pattern: PatternCode;
  first_fraud_txn_id: string;
  txn_ids: string[];
  n_txns: number;
  exposure_usd: number;
  connected_card_ids: string[];
  actions_taken: string;
  report_filed: string;
  analyst_notes: string;
}

export interface EvidenceItem {
  claim: string;
  source: EvidenceSourceCode;
  ref: string;
  entity_ids: string[];
}

export interface ActionRec {
  action: ActionCode;
  route: Route;
  reason: string;
}

export interface AnswerFile {
  /** Only populated by a validated live POST /investigate response. */
  live?: {
    graph_edges?: import("../types").TigerGraphEdgeRecord[];
    edge_metadata?: import("../types").TigerGraphEdgeMetadata;
    ml_assessment?: import("./ml-assessment").MLAssessment;
    dataset_risk_score?: number | null;
    verdict: string; pattern: string; case_status: string; graph_status: string;
    persistence_status: string; uncertainty_reason: string;
    /** Independent summary count from risk_pattern_summary; not used as the returned-ID list length. */
    graph_summary_related_count?: number | null;
    graph_relationships?: {
      customers: string[]; cards: string[]; devices: string[]; emails: string[]; regions: string[]; transactions: string[];
    };
    query_provenance: Record<string, { status?: string; completed_at?: string; transport?: string; error?: { message?: string } }>;
    transaction: { transaction_id: string; amount: number; customer_id?: string; channel?: string; timestamp?: string; card_id?: string };
  };
  case_id: string;
  case: {
    status: CaseStatusCode;
    verdict: Verdict;
    /** Legacy API field currently carries the existing risk_score assessment input. */
    fraud_probability: number | null;
    pattern: PatternCode;
    pattern_description: string;
    affected_txn_ids: string[];
    first_suspicious_txn_id: string;
    connected_card_ids: string[];
    connected_device_profiles: string[];
    exposure_usd: number | null;
    evidence: EvidenceItem[];
    similar_prior_cases: string[];
    summary: string;
    written_to_graph: boolean;
    graph_case_id: string;
  };
  evidence_requests: {
    type: "customer_validation" | "step_up_auth" | "analyst_info";
    asked_after_step: number;
    /** Kept for older answer artifacts; this field is not necessarily a customer reply. */
    assumed_response?: string;
    reason?: string;
    assumption?: string;
    status?: string;
    simulated?: boolean;
    response?: string;
  }[];
  next_best_actions: { initial: ActionRec[]; final: ActionRec[]; what_changed?: string };
  sar: { file: boolean; reason: string; narrative: string; subjects: string[]; total_amount_usd: number | null; activity_dates: string[] };
  stop_reason: string;
  tool_calls: number | null;
  tokens: number | null;
  latency_s: number | null;
  /** frontend-only: the existing transaction risk_score at trigger time */
  _initial_fraud_probability?: number;
}

/** Where an answer came from: a validated live backend result or an agent answer file. */
export type AnswerSource = "agent";
export interface LoadedAnswer { answer: AnswerFile; source: AnswerSource }
