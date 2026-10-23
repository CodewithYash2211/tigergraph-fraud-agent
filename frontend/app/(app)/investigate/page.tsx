"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { AlertCircle, Loader2, Network, Play, RefreshCw } from "lucide-react";
import { useEffect, useState } from "react";
import { useInvestigation } from "@/lib/state/investigation";
import clsx from "clsx";
import { AgentTrace } from "@/components/investigation/Assessment";
import { MLAssessmentCard } from "@/components/investigation/MLAssessment";
import { DEFAULT_CASE_ID, getCase } from "@/lib/data/adapter";
import { PATTERN_LABEL, TRIGGER_LABEL } from "@/lib/data/labels";
import {
  getAgentEventsForCase,
  getEvidenceForCase,
  getGraphForCase,
  getNbaForCase,
} from "@/lib/data/investigation-data";
import { InvestigationGraph, GraphLegend } from "@/components/graph/InvestigationGraph";
import { ReturnedEntityEvidence } from "@/components/graph/ReturnedEntityEvidence";
import { EvidenceFeed, NodeInspector, StageRail } from "@/components/investigation/StudioParts";
import { PageHeader, Skeleton } from "@/components/ui/primitives";

export default function StudioPage() {
  const {
    stage,
    running,
    status,
    runInvestigation,
    caseId,
    decision,
    answer,
    investigationError,
  } = useInvestigation();
  const [selected, setSelected] = useState<string | null>(null);
  const [hover, setHover] = useState<string[] | null>(null);
  const [tab, setTab] = useState<"Evidence" | "Agent activity" | "Recommendation">("Evidence");
  const [relatedTransactionPage, setRelatedTransactionPage] = useState(0);
  const graphStage = Math.min(stage, 6);

  const c = getCase(caseId) || getCase(DEFAULT_CASE_ID)!;
  const rawAnswer = answer?.answer.live ? answer.answer : undefined;

  const graphData = rawAnswer ? getGraphForCase(caseId, rawAnswer, relatedTransactionPage) : null;
  const entities = graphData?.entities ?? [];
  const relations = graphData?.relations ?? [];
  const evidenceList = rawAnswer ? getEvidenceForCase(caseId, rawAnswer) : [];
  const nbaSet = getNbaForCase(caseId, rawAnswer);
  const agentEvents = rawAnswer ? getAgentEventsForCase(caseId, rawAnswer) : [];

  useEffect(() => {
    setRelatedTransactionPage(0);
    setSelected(null);
  }, [caseId, answer]);

  const found = evidenceList.filter((e) => e.stage <= stage).length;
  const nba = stage >= 6 ? nbaSet.after : nbaSet.before;
  const approval =
    rawAnswer?.live
      ? nba.approval
      : decision === "approved"
      ? "Approved by analyst"
      : decision === "rejected"
        ? "Rejected by analyst"
        : decision === "review"
          ? "Escalated"
          : stage >= 7
            ? "Awaiting analyst approval"
            : stage >= 5
              ? "Waiting for card owner"
              : stage >= 4
                ? "No approval needed yet"
                : running
                  ? "Investigation in progress"
                  : "Ready to investigate";

  const patternLabel = rawAnswer?.live?.pattern || "Not identified";
  const patternSub = rawAnswer?.case.pattern_description || "Awaiting backend assessment";

  const handleRunInvestigation = () => {
    runInvestigation(c.case_id, c.flagged_txn_id);
  };

  return (
    <>
      <PageHeader
        context={
          <span className="tnum">
            {c.case_id}, {TRIGGER_LABEL[c.trigger_type].toLowerCase()}, opened {c.opened_at}
          </span>
        }
        title="Investigation Studio"
        desc={c.trigger_text}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded-full bg-white px-3 py-1.5 text-[13px] text-champagne ring-1 ring-champagne/30">
              {running ? "Investigating" : rawAnswer ? "Recommendation ready" : "Ready to investigate"}
            </span>
            {!rawAnswer ? (
              <button
                onClick={handleRunInvestigation}
                disabled={running}
                className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-medium disabled:opacity-80 transition-all"
              >
                {running ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
                {running
                  ? "Investigating backend..."
                  : stage === 0
                    ? "Run investigation"
                    : "Continue investigation"}
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunInvestigation}
                  disabled={running}
                  className="btn-quiet inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-[13.5px] disabled:opacity-80"
                >
                  {running ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={14} />}
                  <span>{running ? "Investigating..." : "Re-run investigation"}</span>
                </button>
                <Link
                  href={
                    stage >= 4 || decision !== "pending"
                      ? "/investigate/decision"
                      : "/investigate/assessment"
                  }
                  className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium"
                >
                  {stage >= 4 ? "Go to decision" : "Assess risk"}
                </Link>
              </div>
            )}
          </div>
        }
      />

      {/* Backend Investigation Error Banner */}
      {investigationError && (
        <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-crimson/30 bg-crimson/[0.08] p-4 text-[13.5px] text-ivory">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-crimson" />
            <div>
              <span className="font-semibold text-crimson">Investigation Backend Error: </span>
              <span>{investigationError}</span>
            </div>
          </div>
          <button
            onClick={handleRunInvestigation}
            className="btn-quiet shrink-0 rounded-lg px-3 py-1 text-[12.5px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Real Active Backend Request Running Banner */}
      {running && (
        <div role="status" aria-live="polite" className="sheet mb-5 p-5 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="grid h-9 w-9 place-items-center rounded-xl bg-champagne/15 text-champagne">
              <Loader2 size={20} className="animate-spin" />
            </div>
            <div>
              <h3 className="font-display text-[15px] font-semibold text-ivory">
                Running backend investigation for {c.case_id} (TXN {c.flagged_txn_id})
              </h3>
              <p className="text-[12.5px] text-ivory-dim">
                Sending <code className="font-display text-[11.5px] bg-slate px-1 rounded">POST /api/investigate</code>. The backend does not stream intermediate progress; results appear when the request returns.
              </p>
            </div>
          </div>
        </div>
      )}

      {rawAnswer?.live && (
        <div role="status" className="sheet mb-5 p-5 text-[13.5px] text-ivory-dim">
          Graph evidence: {rawAnswer.live.graph_status} · Graph persistence: {rawAnswer.live.persistence_status}
          {" · "}Backend verdict: {rawAnswer.live.verdict}
          {" · "}Exposure: {rawAnswer.case.exposure_usd === null ? "Not reported" : `$${rawAnswer.case.exposure_usd.toFixed(2)}`}
          <p className="mt-2">{rawAnswer.live.uncertainty_reason}</p>
        </div>
      )}

      <MLAssessmentCard live={rawAnswer?.live} loading={running} failed={!!investigationError} />

      <section className="sheet mb-5 grid overflow-hidden sm:grid-cols-2 lg:grid-cols-4">
        <Link
          href={`/transactions/${c.flagged_txn_id}/`}
          className="group border-b hairline px-5 py-4 transition-colors hover:bg-white sm:border-r lg:border-b-0"
        >
          <div className="flex items-center gap-2 text-[12px] text-crimson">
            <span className="h-1.5 w-1.5 rounded-full bg-crimson" /> Suspicious transaction
          </div>
          <div className="mt-1 font-display text-[22px] leading-tight tnum">
            TXN {c.flagged_txn_id}
          </div>
          <div className="text-[12.5px] text-ivory-faint group-hover:text-ivory-dim">
            card {rawAnswer?.live?.transaction.card_id || c.card_id}, {(rawAnswer?.live?.transaction.channel || c.channel || "not reported").replace(/_/g, " ")}
          </div>
        </Link>
        <div className="border-b hairline px-5 py-4 lg:border-b-0 lg:border-r">
          <div className="text-[12px] text-ivory-faint">Existing risk_score</div>
          <div
            className={clsx(
              "mt-1 font-display text-[22px] leading-tight",
              (c.risk_score !== null && c.risk_score >= 0.85)
                ? "text-crimson"
                : (c.risk_score !== null && c.risk_score > 0.3)
                  ? "text-champagne"
                  : "text-ivory-faint"
            )}
          >
            {c.risk_score === null ? "Not reported" : c.risk_score.toFixed(2)}
          </div>
          <div className="text-[12.5px] text-ivory-faint tnum">
            Transaction dataset score · separate from XGBoost fraud score
          </div>
        </div>
        <div className="border-b hairline px-5 py-4 sm:border-b-0 sm:border-r">
          <div className="text-[12px] text-ivory-faint">Backend verdict & pattern</div>
          <div
            className={clsx(
              "mt-1 font-display text-[18px] leading-tight",
              !rawAnswer && stage < 3 && "text-ivory-faint"
            )}
          >
            {rawAnswer?.live?.verdict || "Awaiting investigation"}
          </div>
          <div className="text-[12.5px] text-ivory-faint">{patternLabel === "Not identified" ? patternSub : patternLabel}</div>
        </div>
        <div className="px-5 py-4">
          <div className="text-[12px] text-ivory-faint">Approval status</div>
          <div
            className={clsx(
              "mt-1 flex items-center gap-2 text-[15px] font-medium",
              stage >= 7 && decision === "pending"
                ? "text-champagne"
                : decision !== "pending"
                  ? "text-sage"
                  : "text-ivory"
            )}
          >
            {stage >= 7 && decision === "pending" && (
              <span className="h-2 w-2 animate-pulse rounded-full bg-champagne" />
            )}
            {approval}
          </div>
          <div className="text-[12.5px] text-ivory-faint">AI recommends, analyst decides</div>
        </div>
      </section>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
        {/* Graph stage */}
        <section className="sheet relative min-w-0 overflow-hidden" aria-label="Investigation graph">
          <header className="flex min-h-[76px] flex-wrap items-center justify-between gap-3 border-b hairline px-5 py-4 sm:px-7">
            <div className="min-w-0">
              <h2 className="font-display text-[16px]">TigerGraph relationship evidence</h2>
              <p className="mt-1 text-[12px] leading-relaxed text-ivory-faint">{running ? `Retrieving evidence for ${c.flagged_txn_id}` : relations.length ? "Only returned TigerGraph edge records are drawn; the related transaction ID list remains separate." : "Returned entity IDs are listed when no verified edge endpoint pairs are available."}</p>
            </div>
            <span className="shrink-0 rounded-full border border-line px-2.5 py-1 text-[11px] text-ivory-dim">{rawAnswer?.live?.graph_status || (running ? "querying" : "not queried")}</span>
          </header>
          <div className={relations.length > 0 || !rawAnswer ? "relative h-[min(58vh,580px)] min-h-[360px] sm:min-h-[420px]" : "relative min-h-[360px]"}>
            {running && !rawAnswer ? (
              <div className="grid h-full place-items-center">
                <div className="flex flex-col items-center gap-4">
                  <div className="flex gap-6">
                    <Skeleton className="h-12 w-12 !rounded-full" />
                    <Skeleton className="h-10 w-28 !rounded-full" />
                    <Skeleton className="h-12 w-9" />
                  </div>
                  <span className="text-[13px] text-ivory-faint">Waiting for graph evidence</span>
                </div>
              </div>
            ) : entities.length > 1 && relations.length > 0 ? (
              <InvestigationGraph
                stage={graphStage}
                selectedId={selected}
                onSelect={setSelected}
                highlight={hover}
                entities={entities}
                relations={relations}
              />
            ) : rawAnswer && graphData ? (
              <ReturnedEntityEvidence entities={entities} relatedTransactionCount={graphData.relatedTransactionCount}
                graphSummaryRelatedCount={graphData.graphSummaryRelatedCount} graphStatus={rawAnswer.live?.graph_status || "not_reported"}
                edgeMetadata={graphData.edgeMetadata} visibleEdgeCount={relations.length}
                relatedTransactionPage={graphData.relatedTransactionPage}
                relatedTransactionPageCount={graphData.relatedTransactionPageCount} relatedTransactionPageSize={graphData.relatedTransactionPageSize}
                onRelatedTransactionPage={(page) => { setRelatedTransactionPage(page); setSelected(null); }}
                onSelect={setSelected} selectedId={selected} showFlaggedSummary={false} />
            ) : (
              <div className="grid h-full place-items-center p-8 text-center">
                <div><Network size={22} className="mx-auto text-ivory-faint" /><p className="mt-3 text-[14px] text-ivory-dim">{rawAnswer?.live?.graph_status === "complete" ? "TigerGraph queries completed, but returned zero related entities." : rawAnswer ? `No graph relationships returned (status: ${rawAnswer.live?.graph_status || "not reported"}).` : "Run the investigation to retrieve transaction relationships."}</p><p className="mt-1 text-[12px] text-ivory-faint">Query errors and successful empty results are shown separately.</p></div>
              </div>
            )}
          </div>
          {relations.length > 0 && rawAnswer && graphData && (
            <ReturnedEntityEvidence entities={entities} relatedTransactionCount={graphData.relatedTransactionCount}
              graphSummaryRelatedCount={graphData.graphSummaryRelatedCount} graphStatus={rawAnswer.live?.graph_status || "not_reported"}
              edgeMetadata={graphData.edgeMetadata} visibleEdgeCount={relations.length}
              relatedTransactionPage={graphData.relatedTransactionPage}
              relatedTransactionPageCount={graphData.relatedTransactionPageCount} relatedTransactionPageSize={graphData.relatedTransactionPageSize}
              onRelatedTransactionPage={(page) => { setRelatedTransactionPage(page); setSelected(null); }}
              onSelect={setSelected} selectedId={selected} showFlaggedSummary={false} />
          )}
          <div className="flex flex-col gap-5 border-t hairline px-5 pb-8 pt-5 sm:px-7">
            <StageRail stage={stage} done={decision !== "pending"} />
            {relations.length > 0 && <div className="pt-3">
              <GraphLegend />
            </div>}
          </div>
        </section>

        {/* Context panel */}
        <aside className="sheet flex min-h-[420px] flex-col overflow-hidden xl:h-[calc(max(420px,min(64vh,640px))+120px)]">
          <AnimatePresence mode="wait">
            {selected ? (
              <div key="insp" className="h-full overflow-y-auto p-4 sm:p-5 scroll-thin">
                <NodeInspector
                  id={selected}
                  onClose={() => setSelected(null)}
                  entities={entities}
                  evidence={evidenceList}
                />
              </div>
            ) : (
              <motion.div
                key="feed"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex h-full flex-col"
              >
                <div className="flex gap-1 border-b hairline px-4 pt-3" role="tablist">
                  {(["Evidence", "Agent activity", "Recommendation"] as const).map((t) => (
                    <button
                      key={t}
                      role="tab"
                      aria-selected={tab === t}
                      onClick={() => setTab(t)}
                      className={clsx(
                        "relative whitespace-nowrap px-2.5 pb-3 pt-1 text-[13px] transition-colors",
                        tab === t ? "text-ivory" : "text-ivory-faint hover:text-ivory-dim"
                      )}
                    >
                      {t}
                      {t === "Evidence" && (
                        <span className="ml-1.5 text-ivory-faint tnum">{found}</span>
                      )}
                      {tab === t && (
                        <motion.span
                          layoutId="studio-tab"
                          className="absolute inset-x-1 bottom-0 h-0.5 rounded-full bg-champagne"
                        />
                      )}
                    </button>
                  ))}
                </div>
                <div className="flex-1 overflow-y-auto px-4 sm:px-5 scroll-thin">
                  {tab === "Agent activity" ? (
                    stage === 0 && !running && !rawAnswer ? (
                      <p className="py-10 text-[14px] text-ivory-dim">
                        The agent hasn&rsquo;t started. Run the investigation to see each step it takes.
                      </p>
                    ) : (
                      <div className="pt-5">
                        <AgentTrace
                          stage={Math.min(stage, 7)}
                          running={running}
                          events={agentEvents}
                        />
                      </div>
                    )
                  ) : tab === "Recommendation" ? (
                    !rawAnswer ? (
                      <p className="py-10 text-[14px] leading-relaxed text-ivory-dim">
                        No recommendation yet. The backend response includes an assessment input and policy actions when available.
                      </p>
                    ) : (
                        <div className="py-4">
                        <div className="eyebrow !text-ivory-faint">Recommended action</div>
                        <div className="mt-1 font-display text-[22px] leading-tight">
                          {nba.headline}
                        </div>
                        <p className="mt-3 text-[13.5px] leading-relaxed text-ivory-dim">
                          <span className="font-medium text-ivory">Reason: </span>
                          {nba.reasoning[0]}
                        </p>
                        <p className="mt-2 text-[13.5px] leading-relaxed text-ivory-dim">
                          <span className="font-medium text-champagne">Uncertainty: </span>
                          {nba.uncertainty}
                        </p>
                        <div className="mt-4 rounded-xl bg-slate px-4 py-3 text-[13px] ring-1 ring-line">
                          {approval}
                        </div>
                        <Link
                          href="/investigate/decision"
                          className="btn-quiet mt-4 inline-block rounded-xl px-4 py-2 text-[13.5px]"
                        >
                          Open recommendation
                        </Link>
                      </div>
                    )
                  ) : found === 0 ? (
                    <div className="py-10 text-[14px] leading-relaxed text-ivory-dim">
                      {running ? (
                        <div className="space-y-3">
                          <div className="text-ivory-faint">
                            Tracing relationships from payment {c.flagged_txn_id}
                          </div>
                          <Skeleton className="h-3 w-4/5" />
                          <Skeleton className="h-3 w-3/5" />
                        </div>
                      ) : (
                        <>
                          No findings yet. Run the investigation and each piece of evidence appears here as the agent finds it. Click any node to inspect it.
                        </>
                      )}
                    </div>
                  ) : (
                    <EvidenceFeed stage={stage} onHover={setHover} evidence={evidenceList} />
                  )}
                </div>
                <AnimatePresence>
                  {rawAnswer && (
                    <motion.div
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="border-t hairline bg-crimson/[0.05] px-4 py-3"
                    >
                      <div className="text-[12px] text-ivory-faint">Pattern identified</div>
                      <Link
                        href="/intelligence/patterns"
                        className="mt-1 flex items-baseline justify-between gap-3 hover:underline"
                      >
                        <span className="text-[15px]">{patternLabel}</span>
                        <span className="text-[14px] text-crimson">
                          {rawAnswer.live?.verdict}
                        </span>
                      </Link>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            )}
          </AnimatePresence>
        </aside>
      </div>
    </>
  );
}

