"use client";

import { AnimatePresence, motion } from "motion/react";
import { Route, Search, Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { InvestigationGraph, GraphLegend } from "@/components/graph/InvestigationGraph";
import { RelatedTransactionPager } from "@/components/graph/RelatedTransactionPager";
import { ReturnedEntityEvidence } from "@/components/graph/ReturnedEntityEvidence";
import { NodeInspector } from "@/components/investigation/StudioParts";
import { PageHeader, StatePanel } from "@/components/ui/primitives";
import type { EntityKind } from "@/lib/types";
import { useInvestigation } from "@/lib/state/investigation";
import { getEvidenceForCase, getGraphForCase } from "@/lib/data/investigation-data";

const KINDS: { k: EntityKind; label: string }[] = [
  { k: "transaction", label: "Transactions" },
  { k: "account", label: "Cards" },
  { k: "customer", label: "Customers" },
  { k: "device", label: "Devices" },
  { k: "email", label: "Email entities" },
  { k: "location", label: "Regions" },
  { k: "case", label: "Cases" },
];

export default function GraphExplorer() {
  const { caseId, answer } = useInvestigation();
  const rawAnswer = answer?.answer.live ? answer.answer : null;
  const [relatedTransactionPage, setRelatedTransactionPage] = useState(0);
  const graph = useMemo(() => getGraphForCase(caseId, rawAnswer, relatedTransactionPage), [caseId, rawAnswer, relatedTransactionPage]);
  const { entities: ENTITIES, relations: RELATIONS, suspiciousPath: SUSPICIOUS_PATH } = graph;
  const evidence = useMemo(() => getEvidenceForCase(caseId, rawAnswer), [caseId, rawAnswer]);
  const neighbours = (id: string) =>
    RELATIONS.flatMap((r) => (r.source === id ? [r.target] : r.target === id ? [r.source] : []));
  const [kinds, setKinds] = useState<EntityKind[]>(KINDS.map((k) => k.k));
  const [susp, setSusp] = useState(false);
  const [path, setPath] = useState(false);
  const [q, setQ] = useState("");
  const [sel, setSel] = useState<string | null>(null);
  const [shown, setShown] = useState<Set<string>>(new Set());

  useEffect(() => setRelatedTransactionPage(0), [caseId, answer]);

  // First-degree entities are visible; second-degree ones unfold on expansion.
  useEffect(() => {
    setShown(new Set(ENTITIES.filter((e) => e.depth !== 2).map((e) => e.id)));
    setSel(null);
  }, [ENTITIES]);

  const reveal = (ids: string[]) => setShown((p) => new Set([...p, ...ids]));
  const select = (id: string | null) => {
    if (id) reveal([id]);
    setSel(id);
    setPath(false);
  };

  // deep link from search: /intelligence/#D1
  useEffect(() => {
    const read = () => {
      const id = window.location.hash.slice(1);
      if (id && ENTITIES.some((e) => e.id === id)) select(id);
    };
    read();
    window.addEventListener("hashchange", read);
    return () => window.removeEventListener("hashchange", read);
  }, [ENTITIES]);

  const matches = useMemo(() => {
    const t = q.trim().toLowerCase();
    if (!t) return [];
    return ENTITIES.filter((e) => [e.label, e.sub, e.id, e.kind].some((f) => f.toLowerCase().includes(t))).slice(0, 6);
  }, [q, ENTITIES]);

  const hidden = sel ? neighbours(sel).filter((n) => !shown.has(n)).length : 0;
  const hasSuspiciousPath = SUSPICIOUS_PATH.length > 1;
  const hasSuspiciousLinks = RELATIONS.some((relation) => relation.suspicious === true);
  const returnedEntities = ENTITIES.filter((entity) => kinds.includes(entity.kind));
  const flaggedTransaction = ENTITIES.find((entity) => entity.flagged && entity.kind === "transaction");
  const toggle = (k: EntityKind) => setKinds((p) => (p.includes(k) ? p.filter((x) => x !== k) : [...p, k]));
  const tracePath = () => {
    if (!hasSuspiciousPath) return;
    if (!path) reveal(SUSPICIOUS_PATH);
    setSel(null);
    setPath((p) => !p);
  };

  return (
    <>
      <PageHeader
        title="Graph"
        desc={rawAnswer
          ? RELATIONS.length > 0
            ? `${RELATIONS.length} relationship endpoint pairs returned for ${caseId}.`
            : `${graph.relatedTransactionCount.toLocaleString()} unique related transaction IDs returned for ${caseId}. The response has no edge endpoint pairs, so results are shown as lists.`
          : `No live graph for ${caseId} yet. Run an investigation in the studio; only relationships the backend actually returns are drawn here.`}
        actions={
          <>
            <button onClick={() => setShown(new Set(ENTITIES.map((e) => e.id)))} disabled={!RELATIONS.length} title={!RELATIONS.length ? "No endpoint pairs were returned to expand." : undefined} className="btn-quiet rounded-xl px-4 py-2 text-[13.5px] disabled:cursor-not-allowed disabled:opacity-50">
              Expand all
            </button>
            <button onClick={tracePath} aria-pressed={path} disabled={!hasSuspiciousPath}
              title={!hasSuspiciousPath ? "No suspicious path was returned by the backend." : undefined}
              className={clsx("inline-flex items-center gap-2 rounded-xl px-4 py-2 text-[13.5px] ring-1 transition-colors",
                path ? "bg-crimson/15 text-crimson ring-crimson/40" : "text-ivory ring-ivory/15 hover:bg-ivory/[0.05]", !hasSuspiciousPath && "cursor-not-allowed opacity-50")}>
              <Route size={15} /> {path ? "Hide suspicious path" : hasSuspiciousPath ? "Trace suspicious path" : "No suspicious path returned"}
            </button>
          </>
        }
      />

      {flaggedTransaction && (
        <section className="sheet mb-4 flex flex-wrap items-center justify-between gap-x-6 gap-y-2 px-4 py-3 sm:px-5" aria-label="Flagged transaction summary">
          <div className="flex min-w-0 items-center gap-3">
            <span className="h-2 w-2 shrink-0 rounded-full bg-crimson" aria-hidden="true" />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold uppercase tracking-[0.1em] text-crimson">Flagged transaction</p>
              <p className="truncate font-display text-[16px] font-semibold text-ivory tnum">{flaggedTransaction.label}</p>
            </div>
          </div>
          <dl className="flex flex-wrap gap-x-5 gap-y-1 text-[12px]">
            {flaggedTransaction.details.filter((detail) => detail.k !== "Graph query status").map((detail) => (
              <div key={detail.k} className="flex items-center gap-1.5">
                <dt className="text-ivory-faint">{detail.k}</dt>
                <dd className="max-w-[220px] truncate font-medium text-ivory-dim tnum">{detail.v}</dd>
              </div>
            ))}
          </dl>
        </section>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative">
          <label className="flex w-64 items-center gap-2 rounded-xl bg-slate/70 px-3.5 py-2.5 ring-1 ring-ivory/10 focus-within:ring-champagne/50">
            <Search size={16} className="text-ivory-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find an entity"
              className="w-full bg-transparent text-[14px] placeholder:text-ivory-faint focus:outline-none" aria-label="Find an entity" />
          </label>
          <AnimatePresence>
            {q && (
              <motion.ul initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute z-20 mt-2 w-72 overflow-hidden rounded-xl bg-slate ring-1 ring-ivory/15 shadow-2xl">
                {matches.length === 0 ? (
                  <li className="px-4 py-3 text-[13px] text-ivory-faint">No entity called &ldquo;{q}&rdquo;</li>
                ) : matches.map((m) => (
                  <li key={m.id}>
                    <button onClick={() => { select(m.id); setQ(""); }} className="flex w-full justify-between gap-3 px-4 py-2.5 text-left text-[13.5px] hover:bg-ivory/[0.05]">
                      <span className="truncate">{m.label}</span><span className="shrink-0 text-ivory-faint">{m.kind === "account" ? "card" : m.kind}</span>
                    </button>
                  </li>
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {KINDS.map((k) => (
            <button key={k.k} onClick={() => toggle(k.k)} aria-pressed={kinds.includes(k.k)}
              className={clsx("rounded-full px-3 py-1.5 text-[12.5px] ring-1 transition-colors",
                kinds.includes(k.k) ? "bg-ivory/[0.08] text-ivory ring-ivory/20" : "text-ivory-faint ring-ivory/10")}>
              {k.label}
            </button>
          ))}
        </div>
        <button onClick={() => hasSuspiciousLinks && setSusp((v) => !v)} aria-pressed={susp} disabled={!hasSuspiciousLinks}
          title={!hasSuspiciousLinks ? "The query response does not label any links as suspicious." : undefined}
          className={clsx("ml-auto flex items-center gap-2.5 text-[13px] text-ivory-dim", !hasSuspiciousLinks && "cursor-not-allowed opacity-50")}>
          <span className={clsx("relative h-5 w-9 rounded-full transition-colors", susp ? "bg-crimson/70" : "bg-ivory/15")}>
            <motion.span className="absolute top-0.5 h-4 w-4 rounded-full bg-ivory" animate={{ left: susp ? 18 : 2 }} />
          </span>
          Suspicious links only
        </button>
      </div>

      {graph.relatedTransactionCount > graph.relatedTransactionPageSize && (
        <section className="sheet mb-5" aria-label="Related transaction results">
          <RelatedTransactionPager total={graph.relatedTransactionCount} page={graph.relatedTransactionPage}
            pageCount={graph.relatedTransactionPageCount} pageSize={graph.relatedTransactionPageSize} onPage={setRelatedTransactionPage} />
        </section>
      )}

      <div className="grid min-w-0 gap-5 2xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] 2xl:gap-6">
        <section className="sheet relative min-w-0 overflow-hidden">
          <div className={RELATIONS.length ? "h-[clamp(820px,calc(100dvh-120px),960px)] min-h-0" : "min-h-[360px]"}>
            {kinds.length === 0 ? (
              <div className="grid h-full place-items-center">
                <StatePanel kind="noresults" title="Nothing to show" body="Every entity type is filtered out. Turn one back on."
                  action={{ label: "Show all types", onClick: () => setKinds(KINDS.map((k) => k.k)) }} />
              </div>
            ) : ENTITIES.length === 0 ? (
              <div className="grid h-full place-items-center">
                <StatePanel kind="empty" title="No graph evidence yet" body="Run a live investigation and the graph the backend returns appears here. If TigerGraph is unavailable, that is reported instead of drawing a stand-in graph."
                  action={{ label: "Open studio", href: "/investigate" }} />
              </div>
            ) : RELATIONS.length === 0 ? (
              <ReturnedEntityEvidence entities={returnedEntities} relatedTransactionCount={graph.relatedTransactionCount}
                graphSummaryRelatedCount={graph.graphSummaryRelatedCount} graphStatus={rawAnswer?.live?.graph_status || "not_reported"}
                edgeMetadata={graph.edgeMetadata} visibleEdgeCount={RELATIONS.length}
                relatedTransactionPage={graph.relatedTransactionPage}
                relatedTransactionPageCount={graph.relatedTransactionPageCount} relatedTransactionPageSize={graph.relatedTransactionPageSize}
                onRelatedTransactionPage={(page) => { setRelatedTransactionPage(page); setSel(null); }}
                onSelect={select} selectedId={sel} showPager={false} showFlaggedSummary={false} />
            ) : (
              <InvestigationGraph stage={6} kinds={kinds} suspiciousOnly={susp} selectedId={sel} onSelect={select}
                entities={ENTITIES} relations={RELATIONS} alarmFrom={0} only={shown} highlight={path ? SUSPICIOUS_PATH : null} showControls />
            )}
          </div>
          {RELATIONS.length > 0 && (
            <div className="mt-4 rounded-xl border border-line bg-graphite/40">
              <ReturnedEntityEvidence entities={returnedEntities} relatedTransactionCount={graph.relatedTransactionCount}
                graphSummaryRelatedCount={graph.graphSummaryRelatedCount} graphStatus={rawAnswer?.live?.graph_status || "not_reported"}
                edgeMetadata={graph.edgeMetadata} visibleEdgeCount={RELATIONS.length}
                relatedTransactionPage={graph.relatedTransactionPage}
                relatedTransactionPageCount={graph.relatedTransactionPageCount} relatedTransactionPageSize={graph.relatedTransactionPageSize}
                onRelatedTransactionPage={(page) => { setRelatedTransactionPage(page); setSel(null); }}
                onSelect={select} selectedId={sel} showPager={false} showFlaggedSummary={false} />
            </div>
          )}
          <AnimatePresence>
            {path && hasSuspiciousPath && (
              <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                className="absolute left-5 top-5 max-w-sm rounded-xl bg-graphite/85 px-4 py-3 text-[13px] leading-relaxed ring-1 ring-crimson/30 backdrop-blur">
                <span className="text-crimson">Suspicious path.</span> {rawAnswer?.case.summary ?? "The strongest connections the backend returned for the flagged transaction."}
              </motion.div>
            )}
          </AnimatePresence>
          {RELATIONS.length > 0 && <div className="border-t hairline px-6 py-4"><GraphLegend /></div>}
        </section>
        <aside className="sheet min-w-0 overflow-y-auto p-4 scroll-thin sm:p-5 2xl:sticky 2xl:top-24 2xl:h-[clamp(600px,calc(100dvh-220px),820px)] 2xl:p-5">
          <AnimatePresence mode="wait">
            {sel ? (
              <NodeInspector key={sel} id={sel} onClose={() => setSel(null)} hidden={hidden}
                entities={ENTITIES} evidence={evidence} relations={RELATIONS}
                onExpand={() => reveal(neighbours(sel))} />
            ) : (
              <motion.div key="hint" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <h2 className="font-display text-[24px]">Select an entity</h2>
                <p className="mt-2 text-[14px] leading-relaxed text-ivory-dim">
                  {RELATIONS.length > 0 ? "Click a node to inspect it and expand its returned relationships. Drag to pan, scroll with the controls or pinch to zoom." : "Select a returned ID to inspect its evidence. No verified edge endpoints are available, so the returned entities are listed without inferred connections."}
                </p>
                {ENTITIES.length > 0 && (
                  <>
                    <div className="mt-6 text-[12px] text-ivory-faint">Worth starting with</div>
                    <div className="mt-2 space-y-2">
                      {[...ENTITIES].sort((a, b) => Number(!!b.flagged) - Number(!!a.flagged)).slice(0, 3).map((e) => (
                        <button key={e.id} onClick={() => select(e.id)} className="flex w-full items-center justify-between gap-3 rounded-xl px-4 py-3 text-left ring-1 ring-ivory/10 hover:bg-ivory/[0.04]">
                          <span className="text-[14px]">{e.label}</span>
                          <span className={clsx("text-[12px]", e.flagged ? "text-crimson" : "text-ivory-faint")}>{e.sub}</span>
                        </button>
                      ))}
                    </div>
                  </>
                )}
                {RELATIONS.length > 0 && <div className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ivory-faint">
                  <Sparkles size={14} className="mt-0.5 shrink-0 text-champagne" />
                  Lines are included only for source/target endpoint pairs returned by the API.
                </div>}
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </>
  );
}
