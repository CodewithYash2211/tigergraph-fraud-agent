"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { useState } from "react";
import clsx from "clsx";
import { useInvestigation } from "@/lib/state/investigation";
import { useAllAnswers } from "@/lib/data/hooks";
import { RouteTag } from "@/components/case/AnswerParts";
import { PageHeader, StatePanel } from "@/components/ui/primitives";

interface Req { key: string; case_id: string; action: string; route: string; reason: string }

export default function ApprovalsPage() {
  const { stage, decision, caseId, answer } = useInvestigation();
  const { data } = useAllAnswers();
  const [tab, setTab] = useState<"waiting" | "decided">("waiting");

  const rawAnswer = answer?.answer.live ? answer.answer : null;
  const live: Req[] = stage >= 7 && rawAnswer
    ? rawAnswer.next_best_actions.final.filter((a) => a.route !== "auto").map((a) => ({ key: `${caseId}-${a.action}`, case_id: caseId, action: a.action, route: a.route, reason: a.reason }))
    : [];
  const agent: Req[] = Object.values(data).filter((l) => l.source === "agent" && l.answer.case_id !== caseId).flatMap((l) =>
    l.answer.next_best_actions.final.filter((a) => a.route !== "auto").map((a) => ({ key: `${l.answer.case_id}-${a.action}`, case_id: l.answer.case_id, action: a.action, route: a.route, reason: a.reason })));
  const all = [...live, ...agent];
  const decided = (r: Req) => r.case_id === caseId && decision !== "pending";
  const rows = all.filter((r) => (tab === "waiting" ? !decided(r) : decided(r)));

  return (
    <>
      <PageHeader title="Approvals" desc="L1 and L2 actions the agent recommended but may not execute. auto actions never appear here." />
      <div className="relative mb-5 inline-flex rounded-xl bg-white/70 p-1 ring-1 ring-line" role="tablist">
        {(["waiting", "decided"] as const).map((t) => (
          <button key={t} role="tab" aria-selected={tab === t} onClick={() => setTab(t)} className={clsx("relative rounded-lg px-4 py-1.5 text-[13px]", tab === t ? "text-white" : "text-ivory-dim")}>
            {tab === t && <motion.span layoutId="appr-tab" className="absolute inset-0 rounded-lg bg-ivory" />}
            <span className="relative">{t === "waiting" ? "Waiting" : "Decided"}</span>
          </button>
        ))}
      </div>
      <section className="sheet overflow-hidden">
        {rows.length === 0 ? (
          <StatePanel kind="empty" title={tab === "waiting" ? "Nothing waiting" : "No decisions yet"}
            body={tab === "waiting" ? (stage < 7 ? "Run an investigation in the studio up to its recommendation, or add agent answer files, and L1/L2 actions appear here." : "Every L1 and L2 action has been decided.") : "Approve or reject the active case on the Recommendations page and it moves here."}
            action={{ label: stage < 7 ? "Open studio" : "Open recommendations", href: stage < 7 ? "/investigate" : "/investigate/decision" }} />
        ) : (
          <ul>
            {rows.map((r) => (
              <li key={r.key} className="grid gap-3 border-b hairline px-5 py-4 last:border-b-0 sm:px-7 lg:grid-cols-[110px_220px_60px_1fr_auto] lg:items-center">
                <span className="font-display text-[14px]">{r.case_id}</span>
                <span className="font-display text-[13px] font-medium">{r.action}</span>
                <RouteTag route={r.route} />
                <span className="text-[13px] text-ivory-dim">{r.reason}</span>
                {decided(r) ? <span className="text-[13px] capitalize text-sage">{decision === "review" ? "escalated" : decision}</span>
                  : <Link href={r.case_id === caseId ? "/investigate/decision" : `/cases/${r.case_id}/`} className="btn-primary w-fit rounded-lg px-4 py-2 text-[13px] font-medium">Review</Link>}
              </li>
            ))}
          </ul>
        )}
      </section>
      <p className="mt-4 text-[12.5px] text-ivory-faint">Approvals are recorded in this session only. No real card is blocked and no report is filed.</p>
    </>
  );
}
