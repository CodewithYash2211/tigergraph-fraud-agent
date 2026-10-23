export type EntityKind = "customer" | "account" | "device" | "transaction" | "merchant" | "location" | "email" | "case";
export type RiskBand = "high" | "medium" | "low";
export type Trigger = "Model score" | "Customer report" | "Analyst request";

export type CaseStatus =
  | "New"
  | "Investigating"
  | "Evidence found"
  | "Pattern identified"
  | "Risk assessed"
  | "Awaiting evidence"
  | "Recommendation ready"
  | "Awaiting approval"
  | "Reviewed"
  | "Complete";

export interface FraudCase {
  id: string;
  title: string;
  trigger: Trigger;
  amount: number;
  band: RiskBand;
  score: number; // bank model score 0–1 from dataset
  status: CaseStatus;
  opened: string;
  customer: string;
  summary: string;
  signals: string[];
  pattern: string;
  hasInvestigation: boolean;
  analyst: string;
  riskScore: number;
  date: string;
}

export interface GraphEntity {
  id: string;
  kind: EntityKind;
  label: string;
  sub: string;
  x: number;
  y: number;
  stage: number; // investigation stage at which it is revealed
  flagged?: boolean;
  /** 2 = second-degree entity, hidden in the explorer until a neighbour is expanded */
  depth?: 1 | 2;
  details: { k: string; v: string }[];
  note?: string;
}

export type RelationKind = "owns" | "used" | "paid" | "linked" | "prior" | "at";

export interface TigerGraphEdgeRecord {
  e_type: string;
  directed: boolean;
  from_id: string;
  from_type: string;
  to_id: string;
  to_type: string;
  attributes: Record<string, unknown>;
}

export interface TigerGraphEdgeMetadata {
  limit: number;
  returned: number;
  truncated: boolean;
  status: "complete" | "partial" | "failed" | "unavailable";
  source: string;
  error?: string | null;
  invalid_records?: number;
}

export interface GraphRelation {
  id: string;
  source: string;
  target: string;
  kind: RelationKind;
  label: string;
  stage: number;
  suspicious?: boolean;
  /** Original TigerGraph edge type and direction; kind is only a display style. */
  edgeType?: string;
  directed?: boolean;
}

export type EvidenceStrength = "strong" | "contextual" | "weak";
export type EvidenceSource = "graph" | "document" | "customer" | "external";

export interface Evidence {
  id: string;
  title: string;
  detail: string;
  source: EvidenceSource;
  strength: EvidenceStrength;
  stage: number;
  entities: string[];
  query: string;
  time: string;
  confidence: number | null;
}

export interface FraudPattern {
  id: string;
  name: string;
  documented: boolean;
  what: string;
  why: string;
  indicators: string[];
  match: number; // 0–1 for active case
}

export interface AgentEvent {
  id: string;
  stage: number;
  t: string;
  step: string;
  title: string;
  detail: string;
  tool: string;
}

export interface PolicyAction {
  action: string;
  permission: "Agent may execute" | "Analyst approval" | "Senior approval" | "Compliance approval";
  note: string;
}

export interface NextBestAction {
  version: "before" | "after";
  headline: string;
  secondary: string[];
  /** Existing transaction risk_score used by backend assessment; not calibrated probability. */
  probability: number | null;
  actions: { action: string; route: "auto" | "L1" | "L2"; reason: string }[];
  approval: string;
  rules: string[];
  reasoning: string[];
  uncertainty: string;
}

export interface MemoryCase {
  id: string;
  title: string;
  outcome: "Confirmed fraud" | "Cleared";
  similarity: number;
  shared: string;
  decision: string;
  closed: string;
}

export type Decision = "pending" | "approved" | "rejected" | "review";

export interface TransactionRecord {
  id: string;
  entityId: string;
  amount: number;
  time: string;
  date: string;
  merchant: string;
  account: string;
  card: string;
  device: string;
  location: string;
  risk: number;
  modelScore: number;
  flagged: boolean;
  note: string;
  related: string[];
  cases: string[];
}
