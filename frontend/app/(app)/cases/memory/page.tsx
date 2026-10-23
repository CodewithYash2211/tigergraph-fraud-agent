"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { getCasePack, getClosedCaseStats, getSimilarCases } from "@/lib/data/adapter";
import { useInvestigation } from "@/lib/state/investigation";
import { PATTERN_LABEL, money } from "@/lib/data/labels";
import { PageHeader } from "@/components/ui/primitives";

export default function MemoryPage() {
  const { decision, caseId, answer } = useInvestigation();
  const stats = getClosedCaseStats();
  const rawAnswer = answer?.answer;
  const similarPriorCases = rawAnswer?.case.similar_prior_cases || [];
  const related = getSimilarCases(caseId, rawAnswer);
  const linked = getCasePack().filter((c) => c.device_closed_cases.length || c.customer_closed_cases.length).length;

  return (
    <>
      <PageHeader
        title="Case memory"
        desc="Every closed case is memory for the next investigation. The agent retrieves the ones that share a customer, card or device profile, and cites them in similar_prior_cases."
      />

      <section className="mb-5 grid grid-cols-2 gap-px overflow-hidden rounded-2xl bg-line ring-1 ring-line md:grid-cols-4">
        {[["Closed cases", stats.total.toLocaleString()], ["Confirmed fraud", (stats.by_outcome.confirmed_fraud ?? 0).toLocaleString()], ["Cleared", (stats.by_outcome.cleared ?? 0).toLocaleString()], ["Exam cases with a memory link", `${linked} of 20`]].map(([k, v]) => (
          <div key={k} className="bg-white/80 px-5 py-4"><div className="text-[12px] text-ivory-faint">{k}</div><div className="mt-1 font-display text-[24px] tnum">{v}</div></div>
        ))}
      </section>

      <section className="sheet overflow-hidden">
        <div className="flex flex-wrap items-baseline justify-between gap-2 border-b hairline px-6 py-4 sm:px-7">
          <h2 className="font-display text-[17px]">Retrieved for {caseId}</h2>
          <Link href={`/cases/${caseId}/`} className="text-[13px] text-champagne hover:underline">Open case</Link>
        </div>
        <ul>
          {decision !== "pending" && rawAnswer && (
            <li className="grid gap-2 border-b hairline bg-champagne/[0.05] px-6 py-4 text-[13.5px] sm:px-7 md:grid-cols-[110px_1fr]">
              <span className="font-display">{caseId}</span>
              <span>
                Just recorded as memory: {decision === "approved" ? "fraud confirmed by analyst" : decision === "review" ? "escalated" : "recommendation rejected"}
                {rawAnswer.case.written_to_graph ? " (written to TigerGraph)" : " (not written to TigerGraph)"}
              </span>
            </li>
          )}
          {related.map(({ closed: m, why }, i) => (
            <motion.li key={m.case_id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }}
              className="grid gap-2 border-b hairline px-6 py-5 last:border-b-0 sm:px-7 md:grid-cols-[110px_1fr_200px]">
              <div>
                <div className="font-display text-[15px]">{m.case_id}</div>
                <div className="text-[12px] text-ivory-faint tnum">closed {m.closed_at.slice(0, 10)}</div>
              </div>
              <div>
                <div className="text-[13.5px]"><span className={m.outcome === "confirmed_fraud" ? "text-crimson" : "text-sage"}>{m.outcome === "confirmed_fraud" ? "Confirmed fraud" : "Cleared"}</span>, {PATTERN_LABEL[m.pattern].toLowerCase()}, {money(m.exposure_usd)}, report {m.report_filed.toLowerCase()}</div>
                <p className="mt-1 text-[13px] leading-relaxed text-ivory-dim">{m.analyst_notes.replace(/^Case CC-\d+: /, "")}</p>
                <div className="mt-1 text-[12px] text-ivory-faint">Actions: {m.actions_taken.replaceAll("|", ", ")}. {m.connected_card_ids.length} connected cards.</div>
              </div>
              <div className="text-[12.5px] text-ivory-faint md:text-right">{why}</div>
            </motion.li>
          ))}
          {related.length === 0 && (
            <li className="px-6 py-8 text-center text-ivory-dim">
              No prior cases retrieved for this investigation.
            </li>
          )}
        </ul>
      </section>
    </>
  );
}