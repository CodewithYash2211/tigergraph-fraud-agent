"use client";

import Link from "next/link";
import { ArrowRight, CheckCircle2, CircleAlert, Clock3 } from "lucide-react";
import { PageHeader, StatePanel } from "@/components/ui/primitives";
import { useInvestigation } from "@/lib/state/investigation";

export default function ReplayPage() {
  const { caseId, answer } = useInvestigation();
  const rawAnswer = answer?.answer.live ? answer.answer : null;
  const live = rawAnswer?.live;
  const queries = Object.entries(live?.query_provenance || {}).sort(([,a],[,b]) => {
    const ta = a.completed_at ? Date.parse(a.completed_at) : Number.NaN;
    const tb = b.completed_at ? Date.parse(b.completed_at) : Number.NaN;
    return Number.isFinite(ta) && Number.isFinite(tb) ? ta - tb : 0;
  });

  return <>
    <PageHeader context={caseId} title="Investigation timeline" desc="A read-only record of query provenance and outcome returned by the backend. The API does not provide timestamped events for every workflow stage." />
    {!rawAnswer ? <section className="sheet grid min-h-[360px] place-items-center p-8 text-center">
      <StatePanel kind="empty" title="No live investigation response" body="Run the case in Investigation Studio to view query status and the returned policy outcome." action={{label:"Open Investigation Studio",href:"/investigate"}} />
    </section> : <div className="grid items-start gap-5 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,.8fr)]">
      <section className="sheet min-w-0 overflow-hidden" aria-labelledby="query-record-title">
        <header className="border-b hairline px-6 py-5 sm:px-7">
          <div className="eyebrow !text-ivory-faint">BACKEND QUERY PROVENANCE</div>
          <h2 id="query-record-title" className="mt-2 font-display text-[21px]">TigerGraph query results</h2>
          <p className="mt-2 text-[12px] text-ivory-dim">Completed timestamps appear only when the API returned them.</p>
        </header>
        {queries.length ? <ol className="divide-y divide-[var(--line)]">
          {queries.map(([name, query]) => <li key={name} className="grid gap-3 px-6 py-4 sm:grid-cols-[24px_1fr_auto] sm:items-start sm:px-7">
            <span className="mt-0.5 text-champagne">{query.error ? <CircleAlert size={17} /> : <CheckCircle2 size={17} />}</span>
            <div className="min-w-0"><h3 className="break-words text-[13px] font-medium text-ivory">{name}</h3><p className="mt-1 text-[11px] text-ivory-faint">{query.transport || "Transport not reported"}{query.error?.message ? ` · ${query.error.message}` : ""}</p></div>
            <div className="flex items-center gap-2 text-[11px] text-ivory-dim sm:justify-end"><span className="rounded-full border border-line px-2.5 py-1">{query.status || "status not reported"}</span>{query.completed_at && <time className="flex items-center gap-1"><Clock3 size={12} />{new Date(query.completed_at).toLocaleString()}</time>}</div>
          </li>)}
        </ol> : <div className="p-6 text-[13px] text-ivory-dim">The response contains no query provenance records.</div>}
      </section>

      <aside className="sheet min-w-0 overflow-hidden" aria-labelledby="outcome-title">
        <header className="border-b hairline px-6 py-5">
          <div className="eyebrow !text-ivory-faint">RETURNED INVESTIGATION</div>
          <h2 id="outcome-title" className="mt-2 font-display text-[21px]">Outcome and status</h2>
        </header>
        <dl className="divide-y divide-[var(--line)] px-6">
          {[["Transaction", live?.transaction.transaction_id || "Not reported"],["Graph status", live?.graph_status || "Not reported"],["Persistence", live?.persistence_status || "Not reported"],["Backend verdict", live?.verdict || "Not reported"],["Case status", live?.case_status || "Not reported"]].map(([k,v]) => <div key={k} className="flex justify-between gap-4 py-3 text-[12px]"><dt className="text-ivory-faint">{k}</dt><dd className="break-all text-right text-ivory">{v}</dd></div>)}
        </dl>
        <div className="px-6 pb-5 pt-3">
          <div className="text-[11px] text-ivory-faint">Existing policy outcome</div>
          {rawAnswer.next_best_actions.final.length ? <ul className="mt-2 space-y-2">{rawAnswer.next_best_actions.final.map((action,index) => <li key={`${action.action}-${index}`} className="rounded-lg bg-slate px-3 py-2.5"><div className="text-[13px] font-medium text-ivory">{action.action}</div><div className="mt-1 text-[11px] text-ivory-faint">Route {action.route}</div></li>)}</ul> : <p className="mt-2 text-[12px] text-ivory-dim">No final action was returned.</p>}
          <p className="mt-3 text-[11px] leading-relaxed text-ivory-faint">The XGBoost score is an additional shadow signal and does not determine the policy action.</p>
        </div>
      </aside>
    </div>}
    <div className="mt-5 flex justify-end"><Link href="/investigate" className="btn-quiet inline-flex items-center gap-2 rounded-lg px-4 py-2 text-[13px]">Open Investigation Studio <ArrowRight size={14} /></Link></div>
  </>;
}
