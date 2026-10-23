"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import { PATTERNS } from "@/lib/mock/library";
import { getClosedCases, getClosedCaseStats } from "@/lib/data/adapter";
import { useInvestigation } from "@/lib/state/investigation";
import { PageHeader } from "@/components/ui/primitives";

export default function PatternsPage() {
  const { caseId, answer } = useInvestigation();
  const rawAnswer = answer?.answer;
  const stats = getClosedCaseStats();
  const confirmed = stats.by_outcome.confirmed_fraud ?? 0;
  const undocumented = getClosedCases().filter((c) => c.pattern === "undocumented");
  const a = rawAnswer?.case;

  return (
    <>
      <PageHeader title="Fraud patterns" desc="Five documented patterns from the policy, and room for the ones that fit none of them. Counts come from closed_cases_history.csv." />

      {a && (
        <section className="sheet mb-5 p-6 sm:p-8">
          <div className="flex flex-wrap items-baseline justify-between gap-3">
            <div>
              <div className="text-[12.5px] text-ivory-faint">{caseId} is assessed as</div>
              <h2 className="mt-1 font-display text-[clamp(22px,2.4vw,30px)]">
                {a.pattern === "unknown" ? "UNKNOWN / Not identified" : a.pattern === "undocumented" ? "Undocumented pattern" : a.pattern}
              </h2>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-[12.5px] ring-1 ring-line">
              Agent output
            </span>
          </div>
          {a.pattern_description && <p className="mt-4 max-w-3xl text-[15px] leading-relaxed text-ivory-dim">{a.pattern_description}</p>}
          {a.pattern === "unknown" ? (
            <p className="mt-3 text-[13px] text-champagne">Pattern not identified by backend. Handled under R9: create a case, file a report, escalate to an analyst.</p>
          ) : a.pattern === "undocumented" ? (
            <p className="mt-3 text-[13px] text-champagne">Handled under R9: create a case, file a report, escalate to an analyst.</p>
          ) : (
            <p className="mt-3 text-[13px] text-champagne">Matched documented pattern.</p>
          )}
        </section>
      )}

      {!a && (
        <section className="sheet mb-5 p-6 sm:p-8">
          <div className="text-ivory-dim">Run a live investigation to see the pattern assessment for this case.</div>
        </section>
      )}

      <section className="sheet overflow-hidden">
        <ul>
          {PATTERNS.map((p, i) => {
            const n = stats.by_pattern[p.code] ?? 0;
            return (
              <motion.li key={p.code} initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: i * 0.05 } }}
                className={clsx("grid gap-3 border-b hairline px-6 py-5 last:border-b-0 sm:px-8 lg:grid-cols-[230px_1fr_200px] lg:items-center", a?.pattern === p.code && "bg-champagne/[0.05]")}>
                <div>
                  <div className="font-display text-[15px] font-medium">{p.name}</div>
                  <div className="mt-0.5 font-display text-[11.5px] text-ivory-faint">{p.code}, policy {p.rules}</div>
                </div>
                <p className="text-[14px] leading-relaxed text-ivory-dim">{p.signal}</p>
                <div>
                  <div className="flex items-baseline justify-between text-[12.5px]"><span className="text-ivory-faint">Confirmed closed cases</span><span className="tnum">{n.toLocaleString()}</span></div>
                  <div className="mt-1.5 h-1.5 rounded-full bg-ivory/[0.06]">
                    <motion.div className={clsx("h-full rounded-full", p.documented ? "bg-ivory/60" : "bg-champagne")} initial={{ width: 0 }}
                      animate={{ width: `${Math.max(2, (n / confirmed) * 100)}%` }} transition={{ delay: 0.2 + i * 0.05, duration: 0.8 }} />
                  </div>
                </div>
              </motion.li>
            );
          })}
        </ul>
      </section>

      <section className="sheet mt-5 p-6 sm:p-8">
        <h2 className="font-display text-[18px]">The {undocumented.length} undocumented closed cases</h2>
        <p className="mt-1 text-[13.5px] text-ivory-dim">Confirmed fraud the analysts could not match to a known pattern. Their notes are the best clue for new rings.</p>
        <ul className="mt-4 divide-y divide-line">
          {undocumented.map((c) => (
            <li key={c.case_id} className="grid gap-1 py-3 text-[13.5px] md:grid-cols-[90px_110px_1fr]">
              <span className="font-display tnum">{c.case_id}</span>
              <span className="text-ivory-faint">{c.card_id}</span>
              <span className="text-ivory-dim">{c.analyst_notes.replace(/^Case CC-\d+: /, "")}</span>
            </li>
          ))}
        </ul>
      </section>
    </>
  );
}