"use client";

import type { GraphEntity, EntityKind, TigerGraphEdgeMetadata } from "@/lib/types";
import { RelatedTransactionPager } from "@/components/graph/RelatedTransactionPager";

const GROUPS: { kind: EntityKind; label: string }[] = [
  { kind: "customer", label: "Customer IDs" },
  { kind: "account", label: "Card IDs" },
  { kind: "device", label: "Device IDs" },
  { kind: "email", label: "Email IDs" },
  { kind: "location", label: "Region IDs" },
];

export function ReturnedEntityEvidence({
  entities,
  relatedTransactionCount,
  graphSummaryRelatedCount,
  graphStatus,
  edgeMetadata,
  visibleEdgeCount = 0,
  relatedTransactionPage,
  relatedTransactionPageCount,
  relatedTransactionPageSize,
  onRelatedTransactionPage,
  onSelect,
  selectedId,
  showPager = true,
  showFlaggedSummary = true,
}: {
  entities: GraphEntity[];
  relatedTransactionCount: number;
  graphSummaryRelatedCount: number | null;
  graphStatus: string;
  edgeMetadata?: TigerGraphEdgeMetadata;
  visibleEdgeCount?: number;
  relatedTransactionPage: number;
  relatedTransactionPageCount: number;
  relatedTransactionPageSize: number;
  onRelatedTransactionPage: (page: number) => void;
  onSelect?: (id: string) => void;
  selectedId?: string | null;
  showPager?: boolean;
  showFlaggedSummary?: boolean;
}) {
  const flagged = entities.find((entity) => entity.flagged);
  const relatedTransactions = entities.filter((entity) => entity.kind === "transaction" && !entity.flagged);
  const categoryEntities = entities.filter((entity) => !entity.flagged && entity.kind !== "transaction");
  const hasReturnedEntities = entities.some((entity) => !entity.flagged);
  const querySucceeded = graphStatus === "complete" || graphStatus === "partial";
  const edgeStatus = edgeMetadata?.status || "unavailable";
  const returnedEdges = edgeMetadata?.returned ?? 0;

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 p-4 sm:gap-5 sm:p-6 lg:p-8">
      {flagged && showFlaggedSummary && (
        <section className="rounded-2xl border border-champagne/35 bg-champagne/[0.06] p-4 sm:p-5" aria-label="Flagged transaction">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="eyebrow !text-champagne">Flagged transaction</p>
              <h3 className="mt-1 break-words font-display text-xl leading-tight text-ivory sm:text-2xl">{flagged.label}</h3>
              <p className="mt-1 text-sm capitalize text-ivory-dim">{flagged.sub}</p>
            </div>
            {flagged.details.find((detail) => detail.k === "Graph query status") && (
              <span className="shrink-0 rounded-full border border-line px-3 py-1 text-xs text-ivory-dim">
                Query {flagged.details.find((detail) => detail.k === "Graph query status")?.v}
              </span>
            )}
          </div>
          <dl className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {flagged.details.filter((detail) => detail.k !== "Graph query status").map((detail) => (
              <div key={detail.k} className="min-w-0 rounded-xl bg-black/10 px-3 py-2">
                <dt className="text-[11px] text-ivory-faint">{detail.k}</dt>
                <dd className="mt-0.5 break-words text-sm font-medium text-ivory">{detail.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="rounded-xl border border-line bg-slate/50 px-4 py-3 text-[13px] leading-relaxed text-ivory-dim sm:px-5">
        {edgeStatus === "failed"
          ? `TigerGraph query status: ${graphStatus}. Edge retrieval failed${edgeMetadata?.error ? `: ${edgeMetadata.error}` : "."} Returned entity IDs remain available; no edges are inferred.`
          : edgeStatus === "partial" && edgeMetadata?.truncated
            ? `TigerGraph returned ${returnedEdges} actual edge records. The ${edgeMetadata.limit}-edge visualization cap was reached; this is not the total graph-edge count or the related-transaction count. ${visibleEdgeCount} edges connect nodes visible on this page.`
            : returnedEdges > 0
              ? `TigerGraph returned ${returnedEdges} actual edge records. ${visibleEdgeCount} edges connect nodes visible on this page. Relationship IDs and summary counts remain separate.`
              : edgeStatus === "partial"
                ? `Some graph edges could not be validated or retrieved${edgeMetadata?.error ? `: ${edgeMetadata.error}` : "."} Any omitted edge is excluded; no connections are inferred.`
                : querySucceeded
                  ? hasReturnedEntities
                    ? edgeStatus === "complete"
                      ? `TigerGraph query status: ${graphStatus}. It returned entity ID lists, but no verified edge records. This view lists those IDs without drawing a network. A successful empty edge result is distinct from query failure.`
                      : `TigerGraph query status: ${graphStatus}. It returned entity ID lists, but edge retrieval is ${edgeStatus}. The IDs remain visible without inferred connections.`
                    : `TigerGraph query status: ${graphStatus}. No related entity IDs were returned. Query completion does not mean relationships were found.`
                  : `No usable relationship IDs are available (query status: ${graphStatus || "not reported"}). Query errors are separate from a successful empty result.`}
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {GROUPS.map((group) => {
          const items = categoryEntities.filter((entity) => entity.kind === group.kind);
          return (
            <section key={group.kind} className="min-w-0 rounded-xl border border-line bg-slate/35 p-4" aria-label={group.label}>
              <div className="flex items-center justify-between gap-2">
                <h4 className="text-sm font-medium text-ivory">{group.label}</h4>
                <span className="tnum text-xs text-ivory-faint">{items.length}</span>
              </div>
              {items.length ? (
                <ul className="mt-3 flex flex-wrap gap-2">
                  {items.map((entity) => (
                    <li key={entity.id}>
                      <button type="button" onClick={() => onSelect?.(entity.id)} aria-pressed={selectedId === entity.id}
                        className={`max-w-full break-all rounded-lg px-2.5 py-1.5 text-left text-[13px] ring-1 transition-colors ${selectedId === entity.id ? "bg-champagne/10 text-champagne ring-champagne/40" : "text-ivory-dim ring-ivory/10 hover:bg-ivory/[0.05] hover:text-ivory"}`}>
                        {entity.label}
                      </button>
                    </li>
                  ))}
                </ul>
              ) : <p className="mt-3 text-xs text-ivory-faint">No IDs returned</p>}
            </section>
          );
        })}
      </div>

      <section className="min-w-0 rounded-xl border border-line bg-slate/35" aria-label="Related transaction IDs">
        <div className="flex flex-wrap items-start justify-between gap-2 border-b hairline px-4 py-3 sm:px-5">
          <div>
            <h4 className="text-sm font-medium text-ivory">Related transaction IDs</h4>
            <p className="mt-1 text-xs leading-relaxed text-ivory-faint">
              {relatedTransactionCount.toLocaleString()} unique IDs in the returned list
              {graphSummaryRelatedCount === null ? "; no separate summary count reported." : graphSummaryRelatedCount === relatedTransactionCount
                ? `; the separate TigerGraph summary also reports ${graphSummaryRelatedCount.toLocaleString()}.`
                : `; the separate TigerGraph summary reports ${graphSummaryRelatedCount.toLocaleString()}, which differs from the ID list.`}
            </p>
          </div>
        </div>
        {relatedTransactions.length ? (
          <ul className="grid grid-cols-1 gap-px bg-line/60 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {relatedTransactions.map((entity) => (
              <li key={entity.id} className="min-w-0 bg-graphite/80 p-2">
                <button type="button" onClick={() => onSelect?.(entity.id)} aria-pressed={selectedId === entity.id}
                  className={`w-full break-all rounded-lg px-3 py-2 text-left text-[13px] ring-1 transition-colors ${selectedId === entity.id ? "bg-champagne/10 text-champagne ring-champagne/40" : "text-ivory-dim ring-transparent hover:bg-ivory/[0.04] hover:text-ivory"}`}>
                  {entity.label}
                </button>
              </li>
            ))}
          </ul>
        ) : <p className="px-4 py-4 text-sm text-ivory-faint">No related transaction IDs were returned.</p>}
        {showPager && <RelatedTransactionPager total={relatedTransactionCount} page={relatedTransactionPage}
          pageCount={relatedTransactionPageCount} pageSize={relatedTransactionPageSize} onPage={onRelatedTransactionPage} />}
      </section>
    </div>
  );
}
