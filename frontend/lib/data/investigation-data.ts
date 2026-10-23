import { getCase, getClosedCase } from "./adapter";

import { PATTERN_LABEL, TRIGGER_LABEL, money } from "./labels";

import type { AnswerFile } from "./types";

import type {

  AgentEvent,

  Evidence,

  EvidenceSource,

  EvidenceStrength,

  GraphEntity,

  GraphRelation,

  NextBestAction,

} from "../types";

const typedVertexKey = (type: string, id: string) => `${type}\u0000${id}`;
const EDGE_KIND: Record<string, GraphRelation["kind"]> = {
  MADE: "used", OWNS: "owns", FROM_DEVICE: "used", PURCHASER_EMAIL: "linked", BILLED_IN: "at",
};

export const RELATED_TRANSACTIONS_PER_PAGE = 12;


export function getGraphForCase(

  caseId: string,

  answer?: AnswerFile | null,

  relatedTransactionPage = 0,

): { entities: GraphEntity[]; relations: GraphRelation[]; suspiciousPath: string[]; relatedTransactionCount: number; graphSummaryRelatedCount: number | null; edgeMetadata: NonNullable<AnswerFile["live"]>["edge_metadata"]; omittedRelatedTransactionCount: number; relatedTransactionPage: number; relatedTransactionPageCount: number; relatedTransactionPageSize: number } {

  if (answer?.live) {

    const txn = answer.live.transaction;

    const entities: GraphEntity[] = [{ id: "T1", kind: "transaction", label: `TXN ${txn.transaction_id}`,

      sub: txn.channel?.replace(/_/g, " ") || "channel not reported", x: 620, y: 280, stage: 0, flagged: true,

      details: [{ k: "Amount", v: money(txn.amount) }, { k: "Existing risk score", v: answer.live.dataset_risk_score == null ? "Not reported" : answer.live.dataset_risk_score.toFixed(2) },

        { k: "Graph query status", v: answer.live.graph_status }], note: answer.case.summary }];
    const nodeByTypedVertex = new Map<string, string>([[typedVertexKey("Transaction", txn.transaction_id), "T1"]]);

    const returned = answer.live.graph_relationships ?? {
      customers: [], cards: [], devices: [], emails: [], regions: [], transactions: [],
    };
    const relations: GraphRelation[] = [];
    const groups: { kind: GraphEntity["kind"]; vertexType: string; ids: string[]; prefix: string; sub: string }[] = [
      { kind: "customer", vertexType: "Customer", ids: returned.customers, prefix: "customer", sub: "Customer" },
      { kind: "account", vertexType: "Card", ids: returned.cards, prefix: "card", sub: "Card" },
      { kind: "device", vertexType: "DeviceProfile", ids: returned.devices, prefix: "device", sub: "Device" },
      { kind: "email", vertexType: "EmailDomain", ids: returned.emails, prefix: "email", sub: "Email" },
      { kind: "location", vertexType: "BillingRegion", ids: returned.regions, prefix: "region", sub: "Region" },
    ];
    const connectedEntities = groups.flatMap((group) => group.ids.map((id, index) => ({
      id, kind: group.kind, vertexType: group.vertexType, nodeId: `${group.prefix}-${index}`, sub: group.sub,
    })));
    const pageCount = Math.max(1, Math.ceil(returned.transactions.length / RELATED_TRANSACTIONS_PER_PAGE));
    const page = Math.max(0, Math.min(Math.trunc(relatedTransactionPage) || 0, pageCount - 1));
    const start = page * RELATED_TRANSACTIONS_PER_PAGE;
    const visibleRelatedTransactions = returned.transactions.slice(start, start + RELATED_TRANSACTIONS_PER_PAGE);
    const relatedEntities = visibleRelatedTransactions.map((id, index) => ({
      id, kind: "transaction" as const, nodeId: `related-txn-${start + index}`,
      vertexType: "Transaction", sub: "",
    }));

    // Keep direct entities in a spacious inner orbit around the flagged transaction.
    // The current 12-item transaction page uses a separate grid: wide transaction
    // cards on a tight ellipse collided with one another and with their labels.
    const anchor = { x: 620 + 116, y: 280 + 46 };
    const sizeFor = (kind: GraphEntity["kind"]) => {
      if (kind === "account") return { width: 96, height: 64 };
      if (kind === "customer") return { width: 80, height: 80 };
      if (kind === "device") return { width: 60, height: 76 };
      if (kind === "transaction") return { width: 200, height: 68 };
      return { width: 72, height: 72 };
    };
    const placeDirect = (items: typeof connectedEntities) => items.forEach((item, index) => {
      const angle = (2 * Math.PI * index) / Math.max(items.length, 1) - Math.PI / 2;
      const size = sizeFor(item.kind);
      entities.push({ id: item.nodeId, kind: item.kind, label: item.id, sub: item.sub,
        x: Math.round(anchor.x + Math.cos(angle) * 390 - size.width / 2),
        y: Math.round(anchor.y + Math.sin(angle) * 250 - size.height / 2), stage: 1,
        details: [{ k: "Source", v: "TigerGraph investigate_transaction response" }, { k: "Returned ID", v: item.id }],
      note: "Entity ID returned by the installed TigerGraph investigation query. A graph link is drawn only when TigerGraph returns its exact edge endpoints." });
      nodeByTypedVertex.set(typedVertexKey(item.vertexType, item.id), item.nodeId);
    });
    placeDirect(connectedEntities);
    const relatedGrid = { columns: 4, startX: Math.round(anchor.x - (4 * 200 + 3 * 32) / 2), startY: 680, columnStep: 232, rowStep: 92 };
    relatedEntities.forEach((item, index) => {
      const column = index % relatedGrid.columns;
      const row = Math.floor(index / relatedGrid.columns);
      entities.push({ id: item.nodeId, kind: item.kind, label: `TXN ${item.id}`, sub: item.sub,
        x: relatedGrid.startX + column * relatedGrid.columnStep, y: relatedGrid.startY + row * relatedGrid.rowStep, stage: 1,
        details: [{ k: "Source", v: "TigerGraph investigate_transaction response" }, { k: "Returned ID", v: item.id }],
        note: "Transaction ID returned by the installed TigerGraph investigation query." });
      nodeByTypedVertex.set(typedVertexKey(item.vertexType, item.id), item.nodeId);
    });

    const edgeMap = new Map<string, GraphRelation>();
    for (const edge of answer.live.graph_edges || []) {
      const source = nodeByTypedVertex.get(typedVertexKey(edge.from_type, edge.from_id));
      const target = nodeByTypedVertex.get(typedVertexKey(edge.to_type, edge.to_id));
      // A real response is still not a visible graph link unless both exact
      // typed endpoints are among the currently rendered nodes (including page).
      if (!source || !target || source === target || !EDGE_KIND[edge.e_type]) continue;
      const key = JSON.stringify([edge.e_type, edge.directed, edge.from_type, edge.from_id,
        edge.to_type, edge.to_id, edge.attributes]);
      if (edgeMap.has(key)) continue;
      edgeMap.set(key, { id: `tg-edge-${edgeMap.size}`, source, target,
        kind: EDGE_KIND[edge.e_type], label: edge.e_type, edgeType: edge.e_type,
        directed: edge.directed, stage: 1 });
    }
    const edgeMetadata = answer.live.edge_metadata || {
      limit: 200, returned: 0, truncated: false, status: "unavailable" as const,
      source: "not reported", error: null,
    };

    return { entities, relations: [...edgeMap.values()], suspiciousPath: [], relatedTransactionCount: returned.transactions.length,
      graphSummaryRelatedCount: answer.live.graph_summary_related_count ?? null,
      edgeMetadata,
      omittedRelatedTransactionCount: returned.transactions.length - visibleRelatedTransactions.length,
      relatedTransactionPage: page, relatedTransactionPageCount: pageCount,
      relatedTransactionPageSize: RELATED_TRANSACTIONS_PER_PAGE };

  }

  return { entities: [], relations: [], suspiciousPath: [], relatedTransactionCount: 0, edgeMetadata: undefined, omittedRelatedTransactionCount: 0,
    graphSummaryRelatedCount: null,
    relatedTransactionPage: 0, relatedTransactionPageCount: 1, relatedTransactionPageSize: RELATED_TRANSACTIONS_PER_PAGE };

}


export function getEvidenceForCase(

  caseId: string,

  answer?: AnswerFile | null

): Evidence[] {

  if (answer?.live) {

    return answer.case.evidence.map((e, index) => ({

      id: `EV-${index + 1}`, title: e.claim.length > 100 ? e.claim.slice(0, 100) + "…" : e.claim,

      detail: e.claim, source: e.source, strength: "contextual", stage: 1,

      entities: e.entity_ids.includes(answer.live!.transaction.transaction_id) ? ["T1"] : [],

      query: e.ref, time: answer.live!.query_provenance[e.ref]?.completed_at || "Time not reported", confidence: null,

    }));

  }

  return [];

}


export function getNbaForCase(

  caseId: string,

  answer?: AnswerFile | null

): Record<"before" | "after", NextBestAction> {

  if (answer?.live) {

    const make = (version: "before" | "after", actions: AnswerFile["next_best_actions"]["final"]): NextBestAction => ({

      version, headline: actions[0]?.action.replace(/_/g, " ") || "No action returned", secondary: actions.slice(1).map(a => a.action),

      probability: answer.case.fraud_probability, actions,

      approval: actions.length ? actions.map(a => `${a.action}: ${a.route}`).join(", ") : "No route reported",

      rules: [], reasoning: actions.map(a => a.reason), uncertainty: answer.live!.uncertainty_reason,

    });

    return { before: make("before", answer.next_best_actions.initial), after: make("after", answer.next_best_actions.final) };

  }

  return {

    before: {

      version: "before",

      headline: "No recommendation",

      secondary: [],

      probability: null,

      actions: [],

      approval: "No live investigation data",

      rules: [],

      reasoning: [],

      uncertainty: "Run a live investigation to get a recommendation",

    },

    after: {

      version: "after",

      headline: "No recommendation",

      secondary: [],

      probability: null,

      actions: [],

      approval: "No live investigation data",

      rules: [],

      reasoning: [],

      uncertainty: "Run a live investigation to get a recommendation",

    },

  };

}


export function getAgentEventsForCase(

  caseId: string,

  answer?: AnswerFile | null

): AgentEvent[] {

  if (answer?.live) {

    return Object.entries(answer.live.query_provenance).map(([name, query], index) => ({

      id: `live-query-${index}`, stage: 1, t: query.completed_at || "Time not reported", step: "Graph query",

      title: `${name}: ${query.status || "not reported"}`, detail: query.error?.message || `Query status: ${query.status}`,

      tool: query.transport || name,

    })).concat([{ id: "live-decision", stage: 3, t: "Time not reported", step: "Backend recommendation",

      title: answer.next_best_actions.final.map(a => a.action).join(", "), detail: answer.case.summary, tool: "POST /investigate" }]);

  }

  return [];

}
