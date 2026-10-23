"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { Search } from "lucide-react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { getCasePack } from "@/lib/data/adapter";
import { useAllAnswers } from "@/lib/data/hooks";
import { PATTERN_LABEL, STATUS_LABEL, TRIGGER_LABEL, VERDICT_LABEL, money } from "@/lib/data/labels";
import type { PatternCode } from "@/lib/data/types";
import { PageHeader, Skeleton, StatePanel } from "@/components/ui/primitives";

const sel = "rounded-lg bg-white px-2.5 py-2 text-[13px] text-ivory ring-1 ring-line focus:outline-none focus:ring-champagne";

export default function CasesPage() {
  const cases = getCasePack();
  const { loading, data } = useAllAnswers();
  const [q, setQ] = useState("");
  const [trigger, setTrigger] = useState("all");
  const [status, setStatus] = useState("all");
  const [verdict, setVerdict] = useState("all");
  const [pattern, setPattern] = useState("all");
  const [score, setScore] = useState("all");

  const rows = useMemo(() => {
    const t = q.trim().toLowerCase();
    return cases.filter((c) => {
      const a = data[c.case_id]?.answer.case;
      if (t && ![c.case_id, c.card_id, c.customer_id, c.flagged_txn_id, c.trigger_text, a?.pattern ?? ""].some((f) => f.toLowerCase().includes(t))) return false;
      if (trigger !== "all" && c.trigger_type !== trigger) return false;
      if (status !== "all" && (status === "awaiting" ? !!a : a?.status !== status)) return false;
      if (verdict !== "all" && a?.verdict !== verdict) return false;
      if (pattern !== "all" && a?.pattern !== pattern) return false;
      if (score === "high" && !((c.risk_score ?? -1) >= 0.7)) return false;
      if (score === "mid" && !(c.risk_score !== null && c.risk_score < 0.7)) return false;
      if (score === "none" && c.risk_score !== null) return false;
      return true;
    });
  }, [cases, data, q, trigger, status, verdict, pattern, score]);
  const withAnswer = Object.values(data).filter((d) => d.source === "agent").length;

  return (
    <>
      <PageHeader
        title="Case pack"
        desc={<>The {cases.length} exam cases from <code className="font-display text-[13px]">case_pack.csv</code>. {loading ? "Loading agent outputs…" : `${withAnswer} of ${cases.length} have an agent answer file; the rest show “Awaiting agent output”.`}</>}
      />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <label className="flex min-w-[240px] flex-1 items-center gap-2 rounded-xl bg-white/80 px-3.5 py-2.5 ring-1 ring-line focus-within:ring-champagne sm:max-w-xs">
          <Search size={16} className="text-ivory-faint" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Case, card, customer or txn ID"
            className="w-full bg-transparent text-[14px] placeholder:text-ivory-faint focus:outline-none" aria-label="Search cases" />
        </label>
        <select className={sel} value={trigger} onChange={(e) => setTrigger(e.target.value)} aria-label="Trigger">
          <option value="all">All triggers</option><option value="risk_score">Bank model alert</option><option value="customer_report">Customer report</option><option value="analyst_request">Analyst request</option>
        </select>
        <select className={sel} value={score} onChange={(e) => setScore(e.target.value)} aria-label="Bank model score">
          <option value="all">Any model score</option><option value="high">Score ≥ 0.70</option><option value="mid">Score &lt; 0.70</option><option value="none">Not scored</option>
        </select>
        <select className={sel} value={status} onChange={(e) => setStatus(e.target.value)} aria-label="Status">
          <option value="all">Any status</option><option value="awaiting">Awaiting agent output</option>
          {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={sel} value={verdict} onChange={(e) => setVerdict(e.target.value)} aria-label="Verdict">
          <option value="all">Any verdict</option>{Object.entries(VERDICT_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
        </select>
        <select className={sel} value={pattern} onChange={(e) => setPattern(e.target.value)} aria-label="Pattern">
          <option value="all">Any pattern</option>{(Object.keys(PATTERN_LABEL) as PatternCode[]).map((k) => <option key={k} value={k}>{PATTERN_LABEL[k]}</option>)}
        </select>
      </div>

      <section className="sheet overflow-hidden">
        <div className="hidden grid-cols-[110px_minmax(0,1.6fr)_90px_110px_minmax(0,1fr)_110px_24px] gap-4 border-b hairline px-6 py-3 text-[11.5px] text-ivory-faint lg:grid">
          <span>Case</span><span>Alert</span><span>risk_score</span><span>Assessment input</span><span>Pattern and verdict</span><span>Exposure</span><span />
        </div>
        {rows.length === 0 ? (
          <StatePanel kind="noresults" title="No cases match" body="Try clearing a filter. Verdict and pattern filters only match cases that have agent output."
            action={{ label: "Clear filters", onClick: () => { setQ(""); setTrigger("all"); setStatus("all"); setVerdict("all"); setPattern("all"); setScore("all"); } }} />
        ) : (
          <ul>
            {rows.map((c, i) => {
              const L = data[c.case_id];
              const a = L?.answer.case;
              return (
                <motion.li key={c.case_id} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.02 } }} className="border-b hairline last:border-b-0">
                  <Link href={`/cases/${c.case_id}/`}
                    className="grid grid-cols-[1fr_auto] gap-x-4 gap-y-1.5 px-5 py-4 transition-colors hover:bg-white sm:px-6 lg:grid-cols-[110px_minmax(0,1.6fr)_90px_110px_minmax(0,1fr)_110px_24px] lg:items-center">
                    <div>
                      <div className="font-display text-[15px] font-medium">{c.case_id}</div>
                      <div className="text-[11.5px] text-ivory-faint tnum">{c.opened_at.slice(0, 10)}</div>
                    </div>
                    <div className="col-span-2 min-w-0 lg:col-span-1">
                      <div className="truncate text-[13.5px]">{TRIGGER_LABEL[c.trigger_type]}{c.amount_usd !== null ? `, ${money(c.amount_usd)}` : ""}{c.channel ? `, ${c.channel.replace("_", " ")}` : ""}</div>
                      <div className="truncate font-display text-[11.5px] text-ivory-faint">txn {c.flagged_txn_id} on {c.card_id}</div>
                    </div>
                    <div className="text-[13px] tnum"><span className="text-ivory-faint lg:hidden">score </span>{c.risk_score?.toFixed(2) ?? "–"}</div>
                    <div className="text-[13px] tnum">
                      {loading ? <Skeleton className="h-3 w-12" /> : a?.fraud_probability != null ? <span className={clsx("font-display font-medium", a.fraud_probability >= 0.85 ? "text-crimson" : a.fraud_probability <= 0.15 ? "text-sage" : "text-champagne")}>{a.fraud_probability.toFixed(2)}</span> : <span className="text-ivory-faint">–</span>}
                    </div>
                    <div className="min-w-0 text-[13px]">
                      {a ? (<><div className="truncate">{PATTERN_LABEL[a.pattern]}</div><div className="text-[11.5px] text-ivory-faint">{VERDICT_LABEL[a.verdict]}, {STATUS_LABEL[a.status].toLowerCase()}</div></>)
                        : <span className="text-[12.5px] text-ivory-faint">{loading ? "" : "Awaiting agent output"}</span>}
                    </div>
                    <div className="text-[13px] tnum">{a ? (a.verdict === "legitimate" ? "$0.00" : money(a.exposure_usd)) : "–"}</div>
                    <span className="hidden text-ivory-faint lg:block">›</span>
                  </Link>
                </motion.li>
              );
            })}
          </ul>
        )}
      </section>
      <p className="mt-3 text-[12px] text-ivory-faint">Dataset risk_score is the backend assessment input and is distinct from the XGBoost fraud score. The assessment input is not a calibrated probability.</p>
    </>
  );
}
