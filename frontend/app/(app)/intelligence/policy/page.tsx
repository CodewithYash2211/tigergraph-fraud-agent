"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import { POLICY_ACTIONS, POLICY_RULES } from "@/lib/mock/library";
import { PageHeader } from "@/components/ui/primitives";

const BLOCKS = [
  { title: "A case is not a report", body: "CREATE_CASE is the bank's internal record. The displayed backend assessment input retains the existing transaction risk_score and is not a calibrated probability. FILE_REPORT creates a local SAR draft; this interface does not file an external report." },
  { title: "When a SAR is filed", body: "Fraud confirmed or strongly suspected, and at least one of: exposure over $1,000; a shared device profile, region cluster or another customer's fraud; a coordinated or undocumented pattern (R9)." },
  { title: "Asking for more evidence", body: "The backend can record an evidence request. No live customer channel is connected; when a reply is unavailable, the backend marks it SIMULATED_UNAVAILABLE and does not invent a customer response." },
  { title: "When to stop", body: "Backend assessment and evidence-sufficiency rules determine when its bounded workflow stops. The displayed assessment input is the existing risk_score, not a calibrated fraud probability." },
];

export default function PolicyPage() {
  return (
    <>
      <PageHeader title="Fraud Policy v1.0" desc="The backend evaluates configured rules and returns recommended actions. This frontend does not execute approvals, card controls, or external reports." />

      <section className="mb-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {BLOCKS.map((b, i) => (
          <motion.div key={b.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.05 } }} className="sheet p-5">
            <h2 className="font-display text-[15px] font-medium">{b.title}</h2>
            <p className="mt-2 text-[13.5px] leading-relaxed text-ivory-dim">{b.body}</p>
          </motion.div>
        ))}
      </section>

      <div className="grid gap-5 xl:grid-cols-[1.1fr_1fr]">
        <section className="sheet p-6 sm:p-7">
          <h2 className="font-display text-[18px]">Rules</h2>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2">
            {POLICY_RULES.map((r) => (
              <li key={r.id} className={clsx("rounded-xl p-4 ring-1", r.highlight ? "bg-champagne/[0.06] ring-champagne/35" : "bg-white/70 ring-line")}>
                <div className="flex items-baseline gap-2">
                  <span className={clsx("font-display text-[13px] font-semibold", r.highlight ? "text-champagne" : "text-ivory")}>{r.id}</span>
                  <span className="text-[14px] font-medium">{r.title}</span>
                </div>
                <p className="mt-1.5 text-[13px] leading-relaxed text-ivory-dim">{r.body}</p>
              </li>
            ))}
          </ul>
        </section>
        <section className="sheet overflow-hidden">
          <h2 className="px-6 pb-2 pt-6 font-display text-[18px] sm:px-7">Actions and approval routes</h2>
          <p className="px-6 text-[13px] text-ivory-dim sm:px-7">auto: agent may act. L1: team lead. L2: fraud manager.</p>
          <ul className="mt-3">
            {POLICY_ACTIONS.map((a) => (
              <li key={a.action} className="grid grid-cols-[1fr_auto] gap-x-4 border-t hairline px-6 py-2.5 sm:grid-cols-[200px_1fr_64px] sm:px-7">
                <span className="font-display text-[12.5px] font-medium">{a.action}</span>
                <span className="order-3 col-span-2 text-[12.5px] text-ivory-dim sm:order-none sm:col-span-1">{a.does}</span>
                <span className={clsx("h-fit w-fit justify-self-end rounded-full px-2 py-0.5 font-display text-[11px] ring-1",
                  a.route === "auto" ? "text-ivory-dim ring-line" : a.route === "L2" ? "text-crimson ring-crimson/40" : "text-champagne ring-champagne/40")}>{a.route}</span>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
