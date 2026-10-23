import type {
  ActionCode,
  ActionRec,
  AnswerFile,
  CaseStatusCode,
  EvidenceItem,
  EvidenceSourceCode,
  LoadedAnswer,
  PatternCode,
  Route,
  Verdict,
} from "@/lib/data/types";
import type { TigerGraphEdgeMetadata, TigerGraphEdgeRecord } from "@/lib/types";

import { normalizeML, validScore } from "@/lib/data/ml-assessment";

export const BACKEND_URL =
  process.env.NEXT_PUBLIC_BACKEND_URL || "http://127.0.0.1:8000";

function sanitizeBackendMessage(value: unknown): string {
  if (typeof value !== "string") return "Backend query failed.";
  return value
    .replace(/\bBearer\s+[^\s,;]+/gi, "Bearer [redacted]")
    .replace(/\b(token|secret|password|authorization)(\s*[:=]\s*)[^\s,;&]+/gi, "$1$2[redacted]")
    .replace(/([?&](?:token|secret|password)=)[^&\s]+/gi, "$1[redacted]")
    .replace(/https?:\/\/[^/\s:@]+:[^/@\s]+@/gi, "https://[redacted]@")
    .slice(0, 300);
}

// In-memory runtime cache for real backend results during the session
const liveAnswersCache = new Map<string, LoadedAnswer>();

export function getCachedLiveAnswer(caseId: string): LoadedAnswer | undefined {
  if (liveAnswersCache.has(caseId)) {
    return liveAnswersCache.get(caseId);
  }
  // Also check sessionStorage if in browser
  if (typeof window !== "undefined") {
    try {
      const stored = sessionStorage.getItem(`tg-live-answer-v2-${caseId}`);
      if (stored) {
        const parsed = JSON.parse(stored) as LoadedAnswer;
        liveAnswersCache.set(caseId, parsed);
        return parsed;
      }
    } catch {
      /* ignore storage error */
    }
  }
  return undefined;
}

export function setCachedLiveAnswer(caseId: string, answer: LoadedAnswer): void {
  liveAnswersCache.set(caseId, answer);
  if (typeof window !== "undefined") {
    try {
      sessionStorage.setItem(`tg-live-answer-v2-${caseId}`, JSON.stringify(answer));
    } catch {
      /* ignore */
    }
  }
}

/**
 * Maps the real backend response from POST /investigate to the frontend's AnswerFile format.
 */
export function mapBackendToAnswerFile(raw: any, caseId: string): AnswerFile {
  const res = raw.result || raw;

  // Status mapping
  let status: CaseStatusCode = "open";
  const rawStatus = (res.case_status || res.status || "").toLowerCase();
  if (rawStatus.includes("fraud") || rawStatus.includes("closed_fraud")) {
    status = "closed_fraud";
  } else if (rawStatus.includes("clear") || rawStatus.includes("closed_legitimate")) {
    status = "closed_legitimate";
  } else if (rawStatus.includes("escalat")) {
    status = "escalated";
  } else {
    status = "open";
  }

  // Verdict mapping
  let verdict: Verdict = "uncertain";
  const rawVerdict = (res.verdict || "").toLowerCase();
  if (rawVerdict === "fraud" || rawVerdict.includes("confirmed")) {
    verdict = "fraud";
  } else if (
    rawVerdict === "legitimate" ||
    rawVerdict === "cleared" ||
    rawVerdict.includes("low_risk")
  ) {
    verdict = "legitimate";
  } else {
    verdict = "uncertain";
  }

  // Pattern mapping
  let pattern: PatternCode = "unknown";
  const rawPattern = (res.pattern || "").toLowerCase();
  if (rawPattern.includes("card_testing")) pattern = "card_testing";
  else if (rawPattern.includes("card_not_present_new_device"))
    pattern = "card_not_present_new_device";
  else if (rawPattern.includes("card_not_present"))
    pattern = "card_not_present_fraud";
  else if (rawPattern.includes("out_of_region")) pattern = "out_of_region_use";
  else if (rawPattern.includes("account_takeover")) pattern = "account_takeover";
  else if (
    rawPattern.includes("undocumented") ||
    rawPattern.includes("shared_device")
  ) {
    pattern = "undocumented";
  } else {
    pattern = rawPattern === "none" ? "none" : "unknown";
  }

  // Actions mapping
  const initialActions: ActionRec[] = (res.initial_actions || []).map((a: any) => ({
    action: (a.action || "CREATE_CASE") as ActionCode,
    route: (a.route || "auto") as Route,
    reason: a.reason || "",
  }));

  const finalActions: ActionRec[] = (res.final_actions || []).map((a: any) => ({
    action: (a.action || "CREATE_CASE") as ActionCode,
    route: (a.route || "auto") as Route,
    reason: a.reason || "",
  }));

  // Normalize the observed {type, data} evidence containers, not mock claims.
  const containers = Array.isArray(res.evidence) ? res.evidence : [];
  const transaction = containers.find((e: any) => e.type === "transaction")?.data || {};
  const graph = containers.find((e: any) => e.type === "graph")?.data || {};
  const history = containers.find((e: any) => e.type === "historical_cases")?.data || {};
  const rawProvenance = res.graph_query_provenance || graph.query_provenance || {};
  const provenance = Object.fromEntries(Object.entries(rawProvenance).map(([name, value]: [string, any]) => [name, {
    ...value,
    error: value?.error ? { ...value.error, message: sanitizeBackendMessage(value.error.message) } : undefined,
  }]));
  const stringIds = (value: unknown): string[] => Array.isArray(value)
    ? [...new Set(value.filter((item): item is string => typeof item === "string" && item.length > 0))]
    : [];
  const graphRelationships = {
    customers: stringIds(graph.connected_customers),
    cards: stringIds(graph.connected_cards ?? res.connected_card_ids),
    devices: stringIds(graph.connected_devices ?? res.connected_device_profiles),
    emails: stringIds(graph.connected_emails),
    regions: stringIds(graph.connected_regions),
    transactions: stringIds(graph.related_transactions ?? res.related_txn_ids)
      .filter(id => id !== String(res.flagged_txn_id ?? "")),
  };
  const graphEdges: TigerGraphEdgeRecord[] = Array.isArray(graph.graph_edges)
    ? graph.graph_edges.flatMap((edge: any) => {
      if (!edge || typeof edge !== "object"
          || ![edge.e_type, edge.from_type, edge.from_id, edge.to_type, edge.to_id].every((v: unknown) => typeof v === "string" && v.length > 0)
          || typeof edge.directed !== "boolean"
          || (edge.attributes !== undefined && (!edge.attributes || typeof edge.attributes !== "object" || Array.isArray(edge.attributes)))) return [];
      return [{ e_type: edge.e_type, directed: edge.directed, from_type: edge.from_type, from_id: edge.from_id,
        to_type: edge.to_type, to_id: edge.to_id, attributes: edge.attributes || {} }];
    })
    : [];
  const rawEdgeMetadata = graph.edge_metadata || {};
  const edgeStatus = ["complete", "partial", "failed", "unavailable"].includes(rawEdgeMetadata.status)
    ? rawEdgeMetadata.status : "unavailable";
  const edgeMetadata: TigerGraphEdgeMetadata = {
    limit: Number.isSafeInteger(rawEdgeMetadata.limit) && rawEdgeMetadata.limit >= 0 ? rawEdgeMetadata.limit : 200,
    returned: Number.isSafeInteger(rawEdgeMetadata.returned) && rawEdgeMetadata.returned >= 0 ? rawEdgeMetadata.returned : graphEdges.length,
    truncated: rawEdgeMetadata.truncated === true,
    status: edgeStatus,
    source: typeof rawEdgeMetadata.source === "string" ? rawEdgeMetadata.source : "not reported",
    error: typeof rawEdgeMetadata.error === "string" ? sanitizeBackendMessage(rawEdgeMetadata.error) : null,
    invalid_records: Number.isSafeInteger(rawEdgeMetadata.invalid_records) && rawEdgeMetadata.invalid_records >= 0
      ? rawEdgeMetadata.invalid_records : 0,
  };
  const evidence: EvidenceItem[] = [];
  const add = (claim: string, source: EvidenceSourceCode, ref: string, ids = [res.flagged_txn_id].filter(Boolean)) =>
    evidence.push({ claim, source, ref, entity_ids: ids });
  if (transaction.found) {
    add(`Transaction ${transaction.transaction_id}: $${Number(transaction.amount).toFixed(2)}, ${transaction.channel}, risk score ${transaction.risk_score}.`, "document", "transaction_csv");
  }
  const graphStatus = res.graph_query_status || graph.status || "not_reported";
  const summaryRelatedCount = res.graph_pattern_assessment?.related_count
    ?? graph.pattern_assessment?.related_count;
  const graphSummaryRelatedCount = typeof summaryRelatedCount === "number"
    && Number.isSafeInteger(summaryRelatedCount) && summaryRelatedCount >= 0
    ? summaryRelatedCount
    : null;
  add(`TigerGraph evidence: ${graphStatus}.`, "graph", "graph_query_status");
  for (const [name, query] of Object.entries(provenance) as [string, any][]) {
    if (query.error) add(`${name}: ${query.error.message || "Query failed."}`, "graph", name);
  }
  for (const [name, metrics] of Object.entries({
    risk_pattern_summary: res.graph_pattern_assessment || graph.pattern_assessment,
    transaction_velocity: res.graph_velocity || graph.velocity,
    detect_fraud_patterns: res.graph_fraud_pattern_signals || graph.fraud_pattern_signals,
  })) {
    for (const [key, value] of Object.entries(metrics || {})) {
      if (typeof value === "number" || typeof value === "boolean") {
        add(`${name}: ${key.replace(/_/g, " ")} = ${value}${key.includes("related_amount") ? " (related volume, not fraud exposure)" : ""}.`, "graph", name);
      }
    }
  }
  for (const prior of history.similar_cases || res.prior_cases || []) {
    add(`Prior case ${prior.case_id}: ${prior.outcome || "outcome not reported"}; ${(prior.match_reasons || []).join(", ")}.`, "document", "closed_cases_history", [prior.case_id]);
  }
  for (const action of finalActions) add(`${action.action}: ${action.reason} Route: ${action.route}.`, "document", "policy");

  // Evidence requests mapping
  const evidenceRequests = (res.evidence_requests || []).map((r: any, idx: number) => ({
    type: (r.action === "VERIFY_WITH_CUSTOMER"
      ? "customer_validation"
      : r.type || "analyst_info") as
      | "customer_validation"
      | "step_up_auth"
      | "analyst_info",
    asked_after_step: r.iteration || r.asked_after_step || idx + 1,
    reason: typeof r.reason === "string" ? r.reason : undefined,
    status: typeof r.status === "string" ? r.status : undefined,
    simulated: r.simulated === true,
    response: typeof r.response === "string" ? r.response : undefined,
    assumption: typeof r.assumption === "string" ? r.assumption : undefined,
    assumed_response: typeof r.assumed_response === "string" ? r.assumed_response : undefined,
  }));

  // SAR mapping
  const sarObj = res.sar || {};
  const sar = {
    file: Boolean(sarObj.file || res.file_report),
    reason:
      sarObj.reason ||
      (res.file_report
        ? "Policy recommends filing SAR/report based on identified pattern"
        : "No SAR filing required based on current evidence."),
    narrative: sarObj.narrative || (res.file_report ? res.case_summary || "" : ""),
    subjects: sarObj.subjects || [res.customer_id, res.card_id].filter(Boolean),
    total_amount_usd:
      sarObj.total_amount_usd ??
      res.exposure_usd ??
      (res.amount_usd ? Number(res.amount_usd) : null),
    activity_dates:
      sarObj.activity_dates || (res.opened_at ? [res.opened_at.slice(0, 10)] : []),
  };

  const toolCallsCount =
    res.tool_calls ?? (Object.keys(res.graph_query_provenance || {}).length || null);

  let latencySec: number | null = null;
  if (res.started_at && res.updated_at) {
    const diff =
      (new Date(res.updated_at).getTime() - new Date(res.started_at).getTime()) / 1000;
    latencySec = diff > 0 ? Math.round(diff * 10) / 10 : null;
  }

  return {
    live: {
      ml_assessment: normalizeML(res.ml_prediction),
      dataset_risk_score: validScore(transaction.risk_score ?? res.risk_score),
      verdict: res.verdict || "not_reported", pattern: res.pattern || "UNKNOWN",
      case_status: res.case_status || "not_reported", graph_status: graphStatus,
      persistence_status: res.graph_persistence?.status || "not_reported",
      graph_summary_related_count: graphSummaryRelatedCount,
      graph_relationships: graphRelationships,
      graph_edges: graphEdges,
      edge_metadata: edgeMetadata,
      uncertainty_reason: res.uncertainty?.reason || "Evidence sufficiency was not reported by the backend.",
      query_provenance: provenance,
      transaction: { transaction_id: res.flagged_txn_id, amount: Number(transaction.amount),
        customer_id: transaction.customer_id || res.customer_id, channel: transaction.channel,
        timestamp: transaction.timestamp, card_id: transaction.raw?.card1 },
    },
    case_id: res.case_id || caseId,
    case: {
      status,
      verdict,
      fraud_probability: validScore(res.risk_score ?? res.fraud_probability),
      pattern,
      pattern_description: res.pattern_description || res.pattern || "UNKNOWN (not identified by backend)",
      affected_txn_ids:
        res.affected_txn_ids || (res.flagged_txn_id ? [res.flagged_txn_id] : []),
      first_suspicious_txn_id: res.first_suspicious_txn_id || res.flagged_txn_id || "",
      connected_card_ids:
        res.connected_card_ids || (res.card_id ? [res.card_id] : []),
      connected_device_profiles:
        res.connected_device_profiles || (res.device?.profile ? [res.device.profile] : []),
      exposure_usd: res.exposure_usd !== undefined ? Number(res.exposure_usd) : null,
      evidence,
      similar_prior_cases:
        res.assessment?.prior_case_ids ||
        (Array.isArray(res.prior_cases) ? res.prior_cases.map((p: any) => p.case_id) : []) ||
        [],
      summary:
        res.case_summary || res.summary || "Investigation completed via TigerGraph backend.",
      written_to_graph: res.graph_persistence?.status === "success",
      graph_case_id:
        res.created_case?.case_id || res.graph_case_id || res.case_id || caseId,
    },
    evidence_requests: evidenceRequests,
    next_best_actions: {
      initial: initialActions,
      final: finalActions,
      what_changed: typeof res.what_changed === "string" ? res.what_changed : undefined,
    },
    sar,
    stop_reason: res.stop_reason || "Investigation complete.",
    tool_calls: toolCallsCount,
    tokens: null,
    latency_s: latencySec,
    _initial_fraud_probability: validScore(res.risk_score ?? res.fraud_probability) ?? undefined,
  };
}

/** One POST via the existing same-origin proxy. Never retry a write automatically. */
export async function triggerBackendInvestigation(caseId: string, flaggedTxnId: string): Promise<LoadedAnswer> {
  let response: Response;
  try {
    response = await fetch("/api/investigate/", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ case_id: caseId, flagged_txn_id: flaggedTxnId }),
      signal: AbortSignal.timeout(310_000),
    });
  } catch {
    throw new Error("Investigation request could not complete. Check the connection; the backend may still be processing the case.");
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) throw new Error(sanitizeBackendMessage(data?.error || `Investigation failed (HTTP ${response.status}).`));
  if (data?.status !== "success" || data.result?.case_id !== caseId || data.result?.flagged_txn_id !== flaggedTxnId
      || !Array.isArray(data.result?.final_actions)) {
    throw new Error("Backend returned an invalid or mismatched investigation response.");
  }
  const loaded: LoadedAnswer = { answer: mapBackendToAnswerFile(data, caseId), source: "agent" };
  setCachedLiveAnswer(caseId, loaded);
  return loaded;
}
