"use client";

import Link from "next/link";
import { motion } from "motion/react";
import clsx from "clsx";
import { ArrowRight, FileText, FolderLock, Info, Loader2, MessageSquareText, Play, Square, StopCircle } from "lucide-react";
import { useState } from "react";
import type { ActionRec, AnswerFile, AnswerSource, EvidenceSourceCode } from "@/lib/data/types";
import { PATTERN_LABEL, STATUS_LABEL, VERDICT_LABEL, money, pct } from "@/lib/data/labels";

export function SourceBadge({ source }: { source: AnswerSource }) {
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full bg-sage/10 px-2.5 py-0.5 text-[12px] text-sage ring-1 ring-sage/30"
      title="Live result from TigerGraph investigation backend">
      <span className="h-1.5 w-1.5 rounded-full bg-sage" />
      Live Agent Output
    </span>
  );
}

export function RouteTag({ route }: { route: string }) {
  return (
    <span className={clsx("w-fit rounded-full px-2 py-0.5 font-display text-[11px] ring-1",
      route === "auto" ? "text-ivory-dim ring-line" : route === "L1" ? "text-champagne ring-champagne/40" : "text-crimson ring-crimson/40")}>{route}</span>
  );
}

function Actions({ list }: { list: ActionRec[] }) {
  return (
    <ol className="divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
      {list.map((a, i) => (
        <li key={a.action + i} className="grid gap-1 bg-white/70 px-4 py-2.5 sm:grid-cols-[200px_56px_1fr] sm:items-baseline sm:gap-3">
          <span className="font-display text-[12.5px] font-medium">{a.action}</span>
          <RouteTag route={a.route} />
          <span className="text-[12.5px] leading-snug text-ivory-dim">{a.reason}</span>
        </li>
      ))}
    </ol>
  );
}

/** Part 1: the internal case record. */
export function CasePanel({ a }: { a: AnswerFile }) {
  const c = a.case;
  const rows: [string, React.ReactNode][] = [
    ["Status", STATUS_LABEL[c.status]],
    ["Verdict", VERDICT_LABEL[c.verdict]],
    ["Assessment input · existing risk_score", c.fraud_probability?.toFixed(2) ?? "Not reported"],
    ["Pattern", PATTERN_LABEL[c.pattern]],
    ["Exposure", money(c.exposure_usd)],
    ["First suspicious txn", c.first_suspicious_txn_id || "–"],
    ["Written to graph", c.written_to_graph ? `Yes, ${c.graph_case_id}` : "Not yet"],
  ];
  return (
    <section className="sheet p-6 sm:p-7">
      <div className="flex items-center gap-2"><FolderLock size={16} className="text-champagne" /><h2 className="font-display text-[17px]">Case</h2>
        <span className="text-[12px] text-ivory-faint">internal investigation record</span></div>
      <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-3 sm:grid-cols-4">
        {rows.map(([k, v]) => (
          <div key={k}><dt className="text-[11.5px] text-ivory-faint">{k}</dt><dd className="mt-0.5 text-[14px] tnum">{v}</dd></div>
        ))}
      </dl>
      {c.pattern === "undocumented" && c.pattern_description && (
        <p className="mt-4 rounded-xl bg-champagne/[0.06] p-4 text-[13.5px] leading-relaxed text-ivory-dim ring-1 ring-champagne/25">
          <span className="font-medium text-ivory">Pattern description: </span>{c.pattern_description}
        </p>
      )}
      <p className="mt-4 text-[14px] leading-relaxed">{c.summary}</p>
      <div className="mt-5 grid gap-4 border-t hairline pt-4 text-[13px] sm:grid-cols-3">
        <div><div className="text-[11.5px] text-ivory-faint">Affected transactions</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{c.affected_txn_ids.length ? c.affected_txn_ids.map((t) => <Chip key={t} href={`/transactions/${t}/`}>{t}</Chip>) : "None"}</div></div>
        <div><div className="text-[11.5px] text-ivory-faint">Connected cards</div>
          <div className="mt-1 flex flex-wrap gap-1.5">{c.connected_card_ids.length ? c.connected_card_ids.map((t) => <Chip key={t}>{t}</Chip>) : "None"}</div></div>
        <div><div className="text-[11.5px] text-ivory-faint">Connected device profiles</div>
          <div className="mt-1 space-y-1">{c.connected_device_profiles.length ? c.connected_device_profiles.map((t) => <div key={t} className="font-display text-[11.5px] text-ivory-dim">{t}</div>) : "None"}</div></div>
      </div>
    </section>
  );
}

function Chip({ children, href }: { children: React.ReactNode; href?: string }) {
  const cls = "rounded-md bg-slate px-2 py-0.5 font-display text-[11.5px] ring-1 ring-line";
  return href ? <Link href={href} className={clsx(cls, "hover:text-champagne")}>{children}</Link> : <span className={cls}>{children}</span>;
}

/** Part 3: next best action, before and after evidence. */
export function NbaPanel({ a }: { a: AnswerFile }) {
  const nb = a.next_best_actions;
  const changed = nb.what_changed && nb.what_changed !== "nothing";
  return (
    <section className="sheet p-6 sm:p-7">
      <div className="flex items-center gap-2"><ArrowRight size={16} className="text-champagne" /><h2 className="font-display text-[17px]">Next best action</h2>
        <span className="text-[12px] text-ivory-faint">Backend recommendation; this UI does not dispatch approvals</span></div>
      <div className="mt-4 grid gap-5 lg:grid-cols-2">
        <div>
          <div className="mb-2 flex items-baseline justify-between text-[12.5px]"><span className="font-medium">Initial policy action</span>
            {a._initial_fraud_probability !== undefined && <span className="text-ivory-faint tnum">existing risk_score {a._initial_fraud_probability.toFixed(2)}</span>}</div>
          <Actions list={nb.initial} />
        </div>
        <div>
          <div className="mb-2 flex items-baseline justify-between text-[12.5px]"><span className="font-medium">Final policy action</span>
            <span className="text-ivory-faint tnum">existing risk_score {a.case.fraud_probability?.toFixed(2) ?? "not reported"}</span></div>
          <Actions list={nb.final} />
        </div>
      </div>
      {nb.what_changed && <p className={clsx("mt-4 text-[13.5px] leading-relaxed", changed ? "text-ivory" : "text-ivory-dim")}>
        <span className="font-medium">Backend comparison: </span>{nb.what_changed}
      </p>}
    </section>
  );
}

/** Part 2: the SAR, shown only when policy calls for it. */
export function SarPanel({ a }: { a: AnswerFile }) {
  const s = a.sar;
  return (
    <section className={clsx("sheet p-6 sm:p-7", s.file && "ring-1 ring-crimson/25")}>
      <div className="flex flex-wrap items-center gap-2"><FileText size={16} className={s.file ? "text-crimson" : "text-ivory-faint"} />
        <h2 className="font-display text-[17px]">Suspicious activity report</h2>
        <span className={clsx("rounded-full px-2.5 py-0.5 text-[12px] ring-1", s.file ? "text-crimson ring-crimson/35" : "text-ivory-dim ring-line")}>
          {s.file ? "Draft required; not filed" : "Not filed"}</span></div>
      <p className="mt-3 text-[13.5px] text-ivory-dim"><span className="font-medium text-ivory">Reason: </span>{s.reason}</p>
      {s.file && (
        <>
          <blockquote className="mt-4 rounded-xl bg-white/80 p-5 text-[14px] leading-[1.7] ring-1 ring-line">{s.narrative}</blockquote>
          <dl className="mt-4 grid gap-4 text-[13px] sm:grid-cols-3">
            <div><dt className="text-[11.5px] text-ivory-faint">Total amount</dt><dd className="mt-0.5 tnum">{money(s.total_amount_usd)}</dd></div>
            <div><dt className="text-[11.5px] text-ivory-faint">Activity dates</dt><dd className="mt-0.5 tnum">{s.activity_dates.join(" to ") || "–"}</dd></div>
            <div><dt className="text-[11.5px] text-ivory-faint">Subjects</dt><dd className="mt-1 flex flex-wrap gap-1.5">{s.subjects.map((x, i) => <Chip key={`${x}-${i}`}>{x.length > 26 ? x.split(" | ")[0] : x}</Chip>)}</dd></div>
          </dl>
          <p className="mt-3 text-[12px] text-ivory-faint">Draft only. Nothing is sent to a regulator from this interface.</p>
        </>
      )}
    </section>
  );
}

export function EvidenceRequests({ a }: { a: AnswerFile }) {
  return (
    <section className="sheet p-6 sm:p-7">
      <div className="flex items-center gap-2"><MessageSquareText size={16} className="text-champagne" /><h2 className="font-display text-[17px]">Evidence requests</h2></div>
      {a.evidence_requests.length === 0 ? <p className="mt-3 text-[13.5px] text-ivory-dim">No evidence requests were returned by the backend.</p> : (
        <ul className="mt-3 space-y-3">
          {a.evidence_requests.map((r, i) => (
            <li key={i} className="rounded-xl bg-white/70 p-4 ring-1 ring-line">
              <div className="flex flex-wrap items-baseline gap-2 text-[12.5px]">
                <span className="font-display font-medium">{r.type}</span>
                <span className="text-ivory-faint">asked after step {r.asked_after_step}</span>
                {r.status && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] text-[#8a6b33] ring-1 ring-gold/40">{r.status}</span>}
                {r.simulated && <span className="rounded-full bg-gold/10 px-2 py-0.5 text-[11px] text-[#8a6b33] ring-1 ring-gold/40">simulated</span>}
              </div>
              {r.reason && <p className="mt-2 text-[13.5px] leading-relaxed"><span className="font-medium">Request reason: </span>{r.reason}</p>}
              {r.response && <p className="mt-2 text-[13.5px] leading-relaxed"><span className="font-medium">Backend response: </span>{r.response}</p>}
              {r.assumption && <p className="mt-2 text-[13px] leading-relaxed text-ivory-dim"><span className="font-medium">Assumption: </span>{r.assumption}</p>}
              {!r.response && <p className="mt-2 text-[13px] text-ivory-faint">No customer response was reported.</p>}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function StopReason({ a }: { a: AnswerFile }) {
  return (
    <section className="sheet flex gap-4 p-6 sm:p-7">
      <StopCircle size={20} className="mt-0.5 shrink-0 text-ivory" />
      <div>
        <h2 className="font-display text-[17px]">Investigation stopped</h2>
        <p className="mt-2 text-[14px] leading-relaxed text-ivory-dim">{a.stop_reason}</p>
        <div className="mt-3 flex flex-wrap gap-4 text-[12px] text-ivory-faint tnum">
          <span>tool calls {a.tool_calls ?? "–"}</span><span>tokens {a.tokens ?? "–"}</span><span>latency {a.latency_s !== null ? `${a.latency_s}s` : "–"}</span>
        </div>
      </div>
    </section>
  );
}

const SOURCES: ("all" | EvidenceSourceCode)[] = ["all", "graph", "document", "customer", "external"];

export function EvidenceList({ a }: { a: AnswerFile }) {
  const [f, setF] = useState<"all" | EvidenceSourceCode>("all");
  const rows = a.case.evidence.filter((e) => f === "all" || e.source === f);
  return (
    <section className="sheet p-6 sm:p-7">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="font-display text-[17px]">Evidence</h2>
        <div className="flex flex-wrap gap-1.5" role="group" aria-label="Filter evidence by source">
          {SOURCES.map((s) => (
            <button key={s} onClick={() => setF(s)} aria-pressed={f === s}
              className={clsx("rounded-full px-3 py-1 text-[12.5px] capitalize ring-1", f === s ? "bg-ivory text-white ring-ivory" : "bg-white/70 text-ivory-dim ring-line")}>{s}</button>
          ))}
        </div>
      </div>
      {rows.length === 0 ? <p className="mt-4 text-[13.5px] text-ivory-dim">No {f} evidence on this case.</p> : (
        <ol className="mt-4 space-y-2.5">
          {rows.map((e, i) => (
            <motion.li key={`${e.ref}-${e.claim}-${i}`} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04 }}
              className="grid gap-2 rounded-xl bg-white/70 p-4 ring-1 ring-line md:grid-cols-[90px_1fr]">
              <span className={clsx("h-fit w-fit rounded-full px-2 py-0.5 text-[11.5px] capitalize ring-1",
                e.source === "customer" ? "text-champagne ring-champagne/40" : e.source === "graph" ? "text-ivory ring-ivory/30" : "text-ivory-dim ring-line")}>{e.source}</span>
              <div>
                <p className="text-[14px] leading-relaxed">{e.claim}</p>
                <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[11.5px] text-ivory-faint">
                  <code className="rounded bg-slate px-1.5 py-0.5 font-display">{e.ref}</code>
                  {e.entity_ids.map((id, index) => <span key={`${id}-${index}`} className="font-display">{id}</span>)}
                </div>
              </div>
            </motion.li>
          ))}
        </ol>
      )}
    </section>
  );
}

export function AwaitingAnswer({
  caseId,
  onInvestigate,
  isInvestigating,
}: {
  caseId: string;
  onInvestigate?: () => void;
  isInvestigating?: boolean;
}) {
  return (
    <section className="sheet flex flex-col sm:flex-row gap-5 p-6 sm:p-7 justify-between items-start sm:items-center">
      <div className="flex gap-4">
        <Info size={18} className="mt-0.5 shrink-0 text-champagne" />
        <div>
          <h2 className="font-display text-[17px]">Autonomous TigerGraph AI Investigation</h2>
          <p className="mt-2 max-w-2xl text-[14px] leading-relaxed text-ivory-dim">
            Execute the live AI fraud investigation for <code className="rounded bg-slate px-1.5 font-display text-[12px]">{caseId}</code> on the TigerGraph backend. It runs installed queries, graph velocity checks, historical case matching, and policy evaluations.
          </p>
        </div>
      </div>
      {onInvestigate && (
        <button
          onClick={onInvestigate}
          disabled={isInvestigating}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium shrink-0 disabled:opacity-80 shadow-sm"
        >
          {isInvestigating ? <Loader2 size={16} className="animate-spin" /> : <Play size={15} />}
          <span>{isInvestigating ? "Investigating backend..." : "Run Live Investigation"}</span>
        </button>
      )}
    </section>
  );
}
