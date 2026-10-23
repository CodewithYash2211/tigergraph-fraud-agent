"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { InvestigationGraph } from "@/components/graph/InvestigationGraph";
import { ReturnedEntityEvidence } from "@/components/graph/ReturnedEntityEvidence";
import { PageHeader, StatePanel } from "@/components/ui/primitives";
import { useEffect, useState } from "react";
import { useInvestigation } from "@/lib/state/investigation";
import { getCase } from "@/lib/data/adapter";
import { getGraphForCase } from "@/lib/data/investigation-data";

const pct = (value: number | null | undefined) => value == null ? "Not reported" : `${(value * 100).toFixed(2)}%`;

export default function BeforeAfterPage() {
  const { caseId, answer } = useInvestigation();
  const [relatedTransactionPage, setRelatedTransactionPage] = useState(0);
  const rawAnswer = answer?.answer.live ? answer.answer : null;
  const live = rawAnswer?.live;
  const c = getCase(caseId);
  const graph = getGraphForCase(caseId, rawAnswer, relatedTransactionPage);
  const { entities, relations } = graph;
  useEffect(() => setRelatedTransactionPage(0), [caseId, answer]);
  const graphAvailable = Boolean(live && ["complete", "partial"].includes(live.graph_status) && relations.length > 0);
  const ml = live?.ml_assessment;

  return <>
    <PageHeader title="Before and after investigation" desc="Compare the selected case-pack information with context returned for this case. Unsupported or unavailable results stay empty." />
    <div className="grid items-start gap-5 xl:grid-cols-2">
      <section className="sheet min-w-0 overflow-hidden" aria-labelledby="before-title">
        <header className="border-b hairline px-6 py-5 sm:px-7">
          <div className="eyebrow !text-ivory-faint">CASE PACK</div>
          <h2 id="before-title" className="mt-2 font-display text-[22px]">Information before investigation</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ivory-dim">The trigger and transaction details available when this case is selected.</p>
        </header>
        {c ? <dl className="divide-y divide-[var(--line)] px-6 sm:px-7">
          {[
            ["Case", c.case_id], ["Trigger", c.trigger_text], ["Flagged transaction", c.flagged_txn_id],
            ["Customer", c.customer_id], ["Card", c.card_id], ["Channel", c.channel || "Not reported"],
            ["Transaction amount", c.amount_usd == null ? "Not reported" : `$${c.amount_usd.toFixed(2)}`],
            ["Existing risk_score", c.risk_score == null ? "Not reported" : c.risk_score.toFixed(2)],
          ].map(([label,value]) => <div key={label} className="grid gap-1 py-3 sm:grid-cols-[minmax(130px,.7fr)_1.3fr] sm:gap-4">
            <dt className="text-[12px] text-ivory-faint">{label}</dt><dd className="break-words text-[13px] text-ivory">{value}</dd>
          </div>)}
          <p className="py-4 text-[11px] leading-relaxed text-ivory-faint">Existing risk_score is the value in the selected transaction record. It is distinct from the XGBoost fraud score.</p>
        </dl> : <div className="p-6 text-[13px] text-ivory-dim">Case-pack information is unavailable for this selection.</div>}
      </section>

      <section className="sheet min-w-0 overflow-hidden" aria-labelledby="after-title">
        <header className="border-b hairline px-6 py-5 sm:px-7">
          <div className="eyebrow !text-ivory-faint">BACKEND RESPONSE</div>
          <h2 id="after-title" className="mt-2 font-display text-[22px]">Context returned after investigation</h2>
          <p className="mt-2 text-[13px] leading-relaxed text-ivory-dim">Only graph, shadow-model and policy fields present in the selected live response are shown.</p>
        </header>
        {!rawAnswer ? <div className="grid min-h-[350px] place-items-center p-8 text-center">
          <StatePanel kind="empty" title="No live investigation response" body="Run the selected case in Investigation Studio. This panel will show only context returned by the backend." action={{label:"Open Investigation Studio",href:"/investigate"}} />
        </div> : <div className="p-5 sm:p-6">
          <div className="mb-4 flex flex-wrap gap-2 text-[11px]">
            <span className="rounded-full border border-line px-3 py-1.5 text-ivory-dim">Graph: {live?.graph_status || "not reported"}</span>
            <span className="rounded-full border border-line px-3 py-1.5 text-ivory-dim">Persistence: {live?.persistence_status || "not reported"}</span>
          </div>
          {graphAvailable && <div className="h-[min(60vh,600px)] min-h-[420px] overflow-hidden rounded-xl border border-line" aria-label="Returned transaction relationship graph">
            <InvestigationGraph stage={6} interactive={false} compact entities={entities} relations={relations} />
          </div>}
          <div className="mt-4 rounded-xl border border-line">
            <ReturnedEntityEvidence entities={entities} relatedTransactionCount={graph.relatedTransactionCount}
              graphSummaryRelatedCount={graph.graphSummaryRelatedCount} graphStatus={live?.graph_status || "not_reported"}
              edgeMetadata={graph.edgeMetadata} visibleEdgeCount={relations.length}
              relatedTransactionPage={graph.relatedTransactionPage}
              relatedTransactionPageCount={graph.relatedTransactionPageCount} relatedTransactionPageSize={graph.relatedTransactionPageSize}
              onRelatedTransactionPage={setRelatedTransactionPage} showPager />
          </div>
          <dl className="mt-4 grid gap-4 sm:grid-cols-2">
            <div><dt className="text-[11px] text-ivory-faint">XGBoost fraud score</dt><dd className="mt-1 text-[14px] text-ivory tnum">{ml?.available ? pct(ml.fraudScore) : "Unavailable"}</dd></div>
            <div><dt className="text-[11px] text-ivory-faint">Model threshold</dt><dd className="mt-1 text-[14px] text-ivory tnum">{ml?.available ? pct(ml.threshold) : "Not reported"}</dd></div>
            <div><dt className="text-[11px] text-ivory-faint">Model prediction</dt><dd className="mt-1 text-[14px] text-ivory">{ml?.available ? ml.prediction : "Not reported"}</dd></div>
            <div><dt className="text-[11px] text-ivory-faint">Backend verdict</dt><dd className="mt-1 text-[14px] text-ivory">{live?.verdict || "Not reported"}</dd></div>
          </dl>
          <div className="mt-5 border-t hairline pt-4">
            <div className="text-[11px] text-ivory-faint">Existing policy outcome</div>
            {rawAnswer.next_best_actions.final.length ? <ul className="mt-2 space-y-2">{rawAnswer.next_best_actions.final.map((action,index) => <li key={`${action.action}-${index}`} className="flex flex-wrap items-center justify-between gap-2 rounded-lg bg-slate px-3 py-2.5 text-[12px]"><span className="font-medium text-ivory">{action.action}</span><span className="text-ivory-faint">Route {action.route}</span></li>)}</ul> : <p className="mt-2 text-[12px] text-ivory-dim">No policy action was returned.</p>}
            <p className="mt-3 text-[11px] text-ivory-faint">XGBoost is a shadow signal and does not control the policy outcome.</p>
          </div>
        </div>}
      </section>
    </div>
    <div className="mt-5 flex justify-end"><Link href="/investigate" className="btn-quiet inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px]">Open studio <ArrowRight size={14} /></Link></div>
  </>;
}
