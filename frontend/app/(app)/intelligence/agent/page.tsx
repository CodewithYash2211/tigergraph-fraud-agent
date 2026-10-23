"use client";

import { motion } from "motion/react";
import { useInvestigation } from "@/lib/state/investigation";
import { AgentTrace } from "@/components/investigation/Assessment";
import { PageHeader, StatePanel } from "@/components/ui/primitives";
import { getAgentEventsForCase } from "@/lib/data/investigation-data";

const FLOW = [
  { name: "Trigger", sub: "Model score, customer report or analyst" },
  { name: "Backend workflow", sub: "Bounded deterministic investigation" },
  { name: "Tools", sub: "pyTigerGraph queries and local case memory" },
  { name: "Policy router", sub: "Evaluates configured policy rules" },
  { name: "Analyst UI", sub: "Session-only review controls" },
];

export default function AgentPage() {
  const { caseId, answer, stage, running } = useInvestigation();
  const rawAnswer = answer?.answer;
  const events = getAgentEventsForCase(caseId, rawAnswer);

  return (
    <>
      <PageHeader
        title="Agent activity"
        desc={rawAnswer
          ? `Backend-reported graph queries and recommendation for ${caseId}. Intermediate progress is not streamed.`
          : "Run an investigation to see graph query provenance and the backend recommendation after it returns."}
      />

      <section className="sheet mb-5 overflow-x-auto p-6 scroll-thin sm:p-8">
        <ol className="flex min-w-[760px] items-start">
          {FLOW.map((f, i) => (
            <li key={f.name} className="flex flex-1 items-start">
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }} className="w-[150px] shrink-0">
                <div className="flex items-center gap-2">
                  <span className={i === 4 ? "h-2 w-2 rounded-full bg-champagne" : "h-2 w-2 rounded-full bg-cyan"} />
                  <span className="text-[14.5px]">{f.name}</span>
                </div>
                <div className="mt-1 pl-4 text-[12.5px] leading-snug text-ivory-faint">{f.sub}</div>
              </motion.div>
              {i < FLOW.length - 1 && (
                <svg viewBox="0 0 100 10" preserveAspectRatio="none" className="mt-[5px] h-2 flex-1" aria-hidden>
                  <motion.line x1="4" y1="5" x2="96" y2="5" stroke="rgba(30,30,45,0.18)" strokeWidth="1" vectorEffect="non-scaling-stroke"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ delay: 0.2 + i * 0.12, duration: 0.5 }} />
                </svg>
              )}
            </li>
          ))}
        </ol>
      </section>

      <section className="sheet p-6 sm:p-8">
        <h2 className="mb-6 font-display text-[26px]">Trace for {caseId}</h2>
        {events.length === 0 ? (
          <StatePanel kind="empty" title="The agent hasn't started" body="Run the investigation and each tool call appears here in order."
            action={{ label: "Open studio", href: "/investigate" }} />
        ) : (
          <AgentTrace stage={Math.min(stage, 7)} running={running} detailed events={events} />
        )}
      </section>
    </>
  );
}
