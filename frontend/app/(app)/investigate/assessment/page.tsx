"use client";

import Link from "next/link";
import { AnimatePresence, motion } from "motion/react";
import { Loader2, MessageSquareText } from "lucide-react";
import { useEffect } from "react";
import { useInvestigation } from "@/lib/state/investigation";
import { MLAssessmentCard } from "@/components/investigation/MLAssessment";
import {
  AgentTrace,
  BankScore,
  ConfidenceMeter,
  RiskContributions,
  RiskDial,
} from "@/components/investigation/Assessment";
import { NotYet, PageHeader } from "@/components/ui/primitives";
import { DEFAULT_CASE_ID, getCase } from "@/lib/data/adapter";
import { TRIGGER_LABEL } from "@/lib/data/labels";
import {
  getAgentEventsForCase,
  getEvidenceForCase,
  getNbaForCase,
} from "@/lib/data/investigation-data";

export default function AssessmentPage() {
  const { stage, running, jumpTo, requestEvidence, caseId, answer, investigationError } =
    useInvestigation();

  // Arriving right after the pattern step: the agent scores the case.
  useEffect(() => {
    if (stage === 3 && !running) {
      const t = setTimeout(() => jumpTo(4), 1100);
      return () => clearTimeout(t);
    }
  }, [stage, running, jumpTo]);

  const c = getCase(caseId) || getCase(DEFAULT_CASE_ID)!;
  const rawAnswer = answer?.answer;
  const backendRequests = rawAnswer?.evidence_requests ?? [];

  const nbaSet = getNbaForCase(caseId, rawAnswer);
  const agentEvents = getAgentEventsForCase(caseId, rawAnswer);
  const evidenceList = getEvidenceForCase(caseId, rawAnswer);

  if (stage < 3 && !rawAnswer) {
    return (
      <>
        <PageHeader context={c.case_id} title="Assessment" />
        <MLAssessmentCard loading={running} failed={!!investigationError} />
        <NotYet
          title="The agent is still gathering evidence"
          body="Risk is scored only after relationships, evidence and a pattern are in. Run the investigation in the studio, or skip ahead to review the step."
          onJump={() => jumpTo(3)}
          jumpLabel="Skip to assessment"
        />
      </>
    );
  }

  const after = stage >= 6;
  const n = after ? nbaSet.after : nbaSet.before;
  const scored = stage >= 4 || !!rawAnswer;

  return (
    <>
      <PageHeader
        context={c.case_id}
        title="Assessment score and uncertainty"
        desc="The backend assessment uses the transaction's existing risk_score; it is not a calibrated fraud probability. XGBoost remains a separate shadow signal and does not control policy."
      />

      <MLAssessmentCard live={rawAnswer?.live} loading={running} failed={!!investigationError} />
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.05fr)]">
        <section className="sheet p-6 sm:p-8">
          <h2 className="mb-6 font-display text-[26px]">Investigation trace</h2>
          <AgentTrace
            stage={stage}
            running={running || stage === 3}
            events={agentEvents}
          />
        </section>

        <div className="flex flex-col gap-5">
          <section className="sheet p-6 sm:p-8">
            {scored ? (
              <>
                <div className="mb-6">
                  <BankScore
                    score={c.risk_score}
                    trigger={TRIGGER_LABEL[c.trigger_type].toLowerCase()}
                  />
                </div>
                <RiskDial
                  key={after ? "after" : "before"}
                  value={n.probability}
                  previous={after ? nbaSet.before.probability : undefined}
                />
                <div className="mt-8 border-t hairline pt-6">
                  {n.probability === null
                    ? <p className="text-[13px] leading-relaxed text-ivory-dim">No assessment score was returned; the threshold check is unavailable.</p>
                    : <ConfidenceMeter key={after ? "a" : "b"} value={n.probability} stage={stage} evidence={evidenceList} />}
                </div>
                <div className="mt-8 border-t hairline pt-6">
                  <RiskContributions
                    key={after ? "ca" : "cb"}
                    stage={stage}
                    probability={n.probability}
                    evidence={evidenceList}
                  />
                </div>
                <p className="mt-6 rounded-xl bg-graphite/40 px-4 py-3 text-[13.5px] leading-relaxed text-ivory-dim ring-1 ring-ivory/[0.07]">
                  <span className="text-champagne">Remaining uncertainty: </span>
                  {n.uncertainty}
                </p>
              </>
            ) : (
              <div className="flex h-[300px] flex-col items-center justify-center gap-3 text-ivory-dim">
                <Loader2 className="animate-spin text-champagne" size={22} />
                <span className="text-[14px]">Weighing evidence signals</span>
              </div>
            )}
          </section>

          <AnimatePresence mode="wait">
            {stage === 4 && !rawAnswer?.live && (
              <motion.section
                key="ask"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0, transition: { delay: 0.9 } }}
                exit={{ opacity: 0 }}
                className="sheet p-6 sm:p-8"
              >
                <div className="text-[13px] text-champagne">
                  Local request-flow preview
                </div>
                <p className="mt-2 font-display text-[24px] leading-snug">
                  This control advances a local UI preview only. It does not contact the cardholder or change the backend investigation.
                </p>
                <p className="mt-3 text-[14px] text-ivory-dim">
                  Proposed: {nbaSet.before.headline.toLowerCase()}. {nbaSet.before.approval}.
                </p>
                <button
                  onClick={requestEvidence}
                  className="btn-primary mt-6 inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium"
                >
                  <MessageSquareText size={16} /> Preview request state
                </button>
              </motion.section>
            )}

            {stage >= 5 && !rawAnswer?.live && (
              <motion.section
                key="conv"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="sheet p-6 sm:p-8"
              >
                <div className="mb-4 flex items-center justify-between">
                  <span className="text-[13px] text-ivory-faint">
                    Local request-flow preview for case {caseId}
                  </span>
                  <span className="text-[12px] text-ivory-faint">no message sent</span>
                </div>
                <div className="space-y-3">
                  <div className="max-w-[85%] rounded-2xl rounded-tl-md bg-slate-2/80 px-4 py-3 text-[14px] ring-1 ring-ivory/10">
                    A customer validation request would appear here if a live customer channel were connected.
                  </div>
                  {stage === 5 ? (
                    <div className="ml-auto flex w-16 justify-center gap-1 rounded-2xl rounded-tr-md bg-champagne/15 px-3 py-3">
                      {[0, 1, 2].map((i) => (
                        <motion.span
                          key={i}
                          className="h-1.5 w-1.5 rounded-full bg-champagne"
                          animate={{ opacity: [0.3, 1, 0.3] }}
                          transition={{
                            repeat: Infinity,
                            duration: 1,
                            delay: i * 0.15,
                          }}
                        />
                      ))}
                    </div>
                  ) : (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="ml-auto max-w-[85%] rounded-2xl rounded-tr-md bg-champagne/15 px-4 py-3 text-[14px] text-ivory ring-1 ring-champagne/25"
                    >
                      No live customer response is available.
                    </motion.div>
                  )}
                </div>
                {stage >= 7 && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1, transition: { delay: 0.3 } }}
                    className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t hairline pt-5"
                  >
                    <span className="text-[14px] text-ivory-dim">
                      Preview finished; no backend investigation was updated.
                    </span>
                    <Link
                      href="/investigate/decision"
                      className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium"
                    >
                      See recommendation
                    </Link>
                  </motion.div>
                )}
              </motion.section>
            )}
            {rawAnswer?.live && stage >= 4 && (
              <motion.section
                key="backend-requests"
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                className="sheet p-6 sm:p-8"
              >
                <div className="mb-4 flex items-center gap-2">
                  <MessageSquareText size={16} className="text-champagne" />
                  <h2 className="font-display text-[18px]">Backend evidence requests</h2>
                </div>
                {backendRequests.length === 0 ? (
                  <p className="text-[14px] leading-relaxed text-ivory-dim">No customer request or response was returned by the backend.</p>
                ) : (
                  <ul className="space-y-3">
                    {backendRequests.map((request, index) => (
                      <li key={`${request.type}-${request.asked_after_step}-${index}`} className="rounded-xl bg-slate px-4 py-3 ring-1 ring-line">
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <span className="font-display">{request.type}</span>
                          <span className="text-ivory-faint">{request.status || "status not reported"}</span>
                          {request.simulated && <span className="rounded-full px-2 py-0.5 text-[11px] text-champagne ring-1 ring-champagne/30">simulated</span>}
                        </div>
                        {request.reason && <p className="mt-2 text-[13px] text-ivory-dim"><span className="text-ivory">Request reason: </span>{request.reason}</p>}
                        {request.response && <p className="mt-2 text-[13px] text-ivory-dim"><span className="text-ivory">Backend response: </span>{request.response}</p>}
                        {request.assumption && <p className="mt-2 text-[13px] text-ivory-dim"><span className="text-ivory">Assumption: </span>{request.assumption}</p>}
                        {!request.response && <p className="mt-2 text-[12px] text-ivory-faint">No customer response was reported.</p>}
                      </li>
                    ))}
                  </ul>
                )}
                {stage >= 7 && <div className="mt-5 border-t hairline pt-4">
                  <p className="text-[13px] leading-relaxed text-ivory-dim">Final recommendation reflects the backend response. An unavailable customer reply is not treated as customer evidence.</p>
                  <Link href="/investigate/decision" className="btn-primary mt-4 inline-block rounded-xl px-5 py-2.5 text-[14px] font-medium">See backend recommendation</Link>
                </div>}
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </div>
    </>
  );
}

