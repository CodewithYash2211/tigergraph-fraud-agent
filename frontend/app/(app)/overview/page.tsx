"use client";

import Link from "next/link";
import { motion } from "motion/react";
import { ArrowUpRight } from "lucide-react";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { useInvestigation } from "@/lib/state/investigation";
import { STAGES } from "@/lib/data/stages";
import { getCasePack, getSimilarCases } from "@/lib/data/adapter";
import { useAllAnswers } from "@/lib/data/hooks";
import { getAgentEventsForCase } from "@/lib/data/investigation-data";
import { PATTERN_LABEL } from "@/lib/data/labels";
import { StageRail } from "@/components/investigation/StudioParts";
import { ANALYST } from "@/components/nav/Navbar";

export default function OverviewPage() {
  const { stage, decision, status, running, caseId, answer } = useInvestigation();
  const [greet, setGreet] = useState("Hello");
  useEffect(() => {
    const h = new Date().getHours();
    setGreet(h < 12 ? "Good morning" : h < 18 ? "Good afternoon" : "Good evening");
  }, []);

  const pack = getCasePack();
  const { data: answers } = useAllAnswers();
  const rawAnswer = answer?.answer.live ? answer.answer : null;
  const pendingActions = rawAnswer?.next_best_actions.final.filter((x) => x.route !== "auto") ?? [];
  const needsYou = [
    ...(stage >= 7 && decision === "pending"
      ? [{ id: caseId, what: pendingActions.length ? pendingActions.map((x) => `${x.action} (${x.route})`).join(", ") : "Recommendation awaiting review", href: "/investigate/decision" }]
      : []),
    ...Object.values(answers).filter((l) => l.source === "agent" && ["open", "escalated"].includes(l.answer.case.status) && l.answer.next_best_actions.final.some((x) => x.route !== "auto"))
      .map((l) => ({ id: l.answer.case_id, what: l.answer.next_best_actions.final.filter((x) => x.route !== "auto").map((x) => `${x.action} (${x.route})`).join(", "), href: `/cases/${l.answer.case_id}/` })),
  ];
  const open = pack;
  const bands = ([["high", "score ≥ 0.70"], ["medium", "score < 0.70"], ["low", "not scored"]] as const).map(([b, label]) => ({
    b, label, n: pack.filter((c) => (b === "high" ? (c.risk_score ?? -1) >= 0.7 : b === "medium" ? c.risk_score !== null && c.risk_score < 0.7 : c.risk_score === null)).length,
  }));
  const recent = getAgentEventsForCase(caseId, rawAnswer).filter((e) => e.stage <= stage).slice(-3).reverse();
  const memoryCount = getSimilarCases(caseId, rawAnswer).length;

  return (
    <>
      <div className="mb-12 max-w-3xl">
        <div className="text-[13px] text-ivory-faint">{ANALYST.role}</div>
        <h1 className="mt-2 font-display text-[clamp(28px,3.4vw,44px)] leading-[1.08]">{greet}.</h1>
        <p className="mt-4 text-[18px] leading-relaxed text-ivory-dim">
          {needsYou.length === 0 ? "Nothing is waiting for your approval." : needsYou.length === 1 ? "One decision is waiting for you." : `${needsYou.length} decisions are waiting for you.`}{" "}
          {decision === "approved" || decision === "rejected" ? `Your ${decision} choice for ${caseId} is saved in this browser session only.` : decision === "review" ? `Your escalation choice for ${caseId} is saved in this browser session only.` : running ? `The backend is processing ${caseId}; intermediate progress is not streamed.` : stage === 0 ? `${pack.length} cases from the case pack are ready to investigate.` : `${caseId} is at “${STAGES[Math.min(stage, STAGES.length - 1)].label.toLowerCase()}”.`}
        </p>
      </div>

      <div className="grid gap-10 xl:grid-cols-[1.3fr_1fr]">
        <div className="space-y-10">
          <section>
            <h2 className="mb-3 text-[13px] text-ivory-faint">Needs your decision</h2>
            <ul className="border-t hairline">
              {needsYou.map((n, i) => (
                <motion.li key={n.id} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }} className="border-b hairline">
                  <Link href={n.href} className="group flex items-center justify-between gap-4 py-5">
                    <div>
                      <div className="text-[12.5px] text-ivory-faint tnum">{n.id}</div>
                      <div className="mt-0.5 font-display text-[24px] leading-tight">{n.what}</div>
                    </div>
                    <span className="flex items-center gap-2 text-[13px] text-champagne">
                      Review <ArrowUpRight size={15} className="transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
                    </span>
                  </Link>
                </motion.li>
              ))}
            </ul>
          </section>

          <section className="sheet p-6 sm:p-8">
            <div className="flex flex-wrap items-baseline justify-between gap-3">
              <div>
                <div className="text-[13px] text-ivory-faint tnum">Active investigation, {caseId}</div>
                <div className="mt-1 font-display text-[24px] leading-tight">{rawAnswer ? PATTERN_LABEL[rawAnswer.case.pattern] : "No live investigation yet"}</div>
              </div>
              <span className="rounded-full px-3 py-1 text-[13px] text-champagne ring-1 ring-champagne/25">{status}</span>
            </div>
            <div className="mt-8 pb-6"><StageRail stage={stage} done={decision !== "pending"} /></div>
            <div className="mt-4 flex flex-wrap gap-3">
              <Link href="/investigate" className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium">{stage === 0 ? "Start investigation" : "Open studio"}</Link>
              <Link href={`/cases/${caseId}/`} className="btn-quiet rounded-xl px-5 py-2.5 text-[14px]">Case detail</Link>
              <Link href="/cases/memory" className="px-2 py-2.5 text-[13.5px] text-ivory-dim hover:text-ivory">{memoryCount === 0 ? "No closed cases retrieved" : `${memoryCount} closed case${memoryCount === 1 ? "" : "s"} in memory`}</Link>
            </div>
          </section>
        </div>

        <div className="space-y-10">
          <section>
            <h2 className="mb-4 text-[13px] text-ivory-faint">Case pack by bank model score</h2>
            <div className="flex h-3 overflow-hidden rounded-full">
              {bands.map(({ b, n }) => (
                <motion.div key={b} initial={{ width: 0 }} animate={{ width: `${(n / open.length) * 100}%` }} transition={{ duration: 0.9 }}
                  className={clsx(b === "high" ? "bg-crimson" : b === "medium" ? "bg-champagne" : "bg-ivory/30")} />
              ))}
            </div>
            <dl className="mt-4 grid grid-cols-3">
              {bands.map(({ b, n }) => (
                <div key={b}><dt className="text-[12px] text-ivory-faint">{bands.find((x) => x.b === b)!.label}</dt><dd className="font-display text-[34px] leading-none tnum">{n}</dd></div>
              ))}
            </dl>
            <p className="mt-3 text-[12px] text-ivory-faint">A score is why a case is looked at, never the verdict.</p>
            <Link href="/cases" className="mt-2 inline-block text-[13.5px] text-ivory-dim hover:text-ivory">Open all {pack.length} cases</Link>
          </section>

          <section>
            <h2 className="mb-3 text-[13px] text-ivory-faint">Latest from the agent</h2>
            {recent.length === 0 ? (
              <p className="border-t hairline pt-4 text-[14px] text-ivory-dim">The agent is idle. Start the investigation to see its steps here.</p>
            ) : (
              <ol className="border-t hairline">
                {recent.map((e) => (
                  <li key={e.id} className="grid grid-cols-[64px_1fr] gap-3 border-b hairline py-3.5">
                    <span className="text-[12.5px] text-ivory-faint tnum">{e.t}</span>
                    <span><span className="block text-[12px] text-champagne">{e.step}</span><span className="text-[14.5px]">{e.title}</span></span>
                  </li>
                ))}
              </ol>
            )}
            <Link href="/intelligence/agent" className="mt-4 inline-block text-[13.5px] text-ivory-dim hover:text-ivory">All agent activity</Link>
          </section>
        </div>
      </div>
    </>
  );
}
