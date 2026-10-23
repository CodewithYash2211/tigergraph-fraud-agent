"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useInvestigation } from "@/lib/state/investigation";
import { ApprovalPanel, Recommendation } from "@/components/investigation/Decision";
import { NotYet, PageHeader } from "@/components/ui/primitives";
import {
  EvidenceRequests,
  SarPanel,
  SourceBadge,
  StopReason,
} from "@/components/case/AnswerParts";
import { motion } from "motion/react";
import { getCase } from "@/lib/data/adapter";
import {
  getEvidenceForCase,
  getNbaForCase,
} from "@/lib/data/investigation-data";

export default function DecisionPage() {
  const {
    stage,
    decision,
    decidedAt,
    rejectReason,
    decide,
    jumpTo,
    caseId,
    answer,
  } = useInvestigation();
  const rawAnswer = answer?.answer;

  const c = getCase(caseId);
  const ready = stage >= 7 || !!rawAnswer;
  const [version, setVersion] = useState<"before" | "after">(ready ? "after" : "before");

  useEffect(() => {
    setVersion(stage >= 7 || !!rawAnswer ? "after" : "before");
  }, [stage, rawAnswer]);

  const nbaSet = getNbaForCase(caseId, rawAnswer);
  const evidenceList = getEvidenceForCase(caseId, rawAnswer);
  const comparisonNote = !rawAnswer
    ? "No live backend response is available for comparison."
    : rawAnswer.next_best_actions.what_changed
      || (rawAnswer.evidence_requests.length
        ? "The backend recorded an evidence request; its status and any response are shown below."
        : "No evidence request or customer response is recorded. Initial and final policy actions below are the values returned by the backend.");

  if (stage < 4 && !rawAnswer) {
    return (
      <>
        <PageHeader context={c?.case_id || caseId} title="Decision" />
        <NotYet
          title="No recommendation yet"
          body="The agent recommends an action only after it has assessed risk and confidence."
          onJump={() => jumpTo(7)}
          jumpLabel="Skip to recommendation"
        />
      </>
    );
  }

  return (
    <>
      <PageHeader
        context={c?.case_id || caseId}
        title={ready ? "The agent recommends. You decide." : "The agent wants more evidence first"}
        desc={
          ready
            ? "Compare the backend-reported initial and final policy actions. A customer reply is shown only if the backend reports one."
            : "At this confidence, the agent proposes a reversible step it's allowed to take alone."
        }
      />
      {ready && (
        <ol className="sheet mb-5 grid overflow-hidden sm:grid-cols-3 lg:grid-cols-7" aria-label="Decision chain">
          {[
            ["Assessment input", rawAnswer && nbaSet.after.probability !== null ? `risk_score ${nbaSet.after.probability.toFixed(2)}` : "Not reported"],
            ["Evidence", `${evidenceList.filter((e) => e.stage <= stage).length} findings`],
            ["Policy rule", nbaSet.after.rules.join(", ") || "Not reported by backend"],
            ["Action", nbaSet.after.actions[0]?.action || "No action"],
            ["Route", nbaSet.after.approval],
            ["Backend case", rawAnswer?.case.status || "Not reported"],
            ["SAR", rawAnswer?.sar.file ? "Draft present; not filed" : "No SAR draft reported"],
          ].map(([k, v], i) => (
            <motion.li key={k} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.06 } }}
              className="relative border-b hairline px-4 py-3.5 lg:border-b-0 lg:border-r lg:last:border-r-0">
              <div className="text-[11.5px] text-ivory-faint">{i + 1}. {k}</div>
              <div className="mt-0.5 font-display text-[12.5px] leading-snug">{v}</div>
            </motion.li>
          ))}
        </ol>
      )}
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.55fr)_minmax(320px,1fr)]">
        <section className="sheet p-6 sm:p-9">
          <Recommendation
            version={version}
            showCompare={ready}
            onVersion={setVersion}
            nba={nbaSet}
            whatChanged={rawAnswer?.next_best_actions?.what_changed}
            comparisonNote={comparisonNote}
            comparisonLabels={{ before: "Initial policy", after: "Final policy" }}
            scoreAvailable={!!rawAnswer}
          />
        </section>
        <section className="sheet p-6 sm:p-8">
          <h2 className="mb-6 font-display text-[26px]">Your decision</h2>
          {ready ? (
            <ApprovalPanel decision={decision} decidedAt={decidedAt} rejectReason={rejectReason} onDecide={decide} caseId={c?.case_id || caseId}
              waitingNote={nbaSet.after.actions.filter((a) => a.route !== "auto").map((a) => `${a.action} waits for ${a.route}`).join("; ") || undefined} />
          ) : (
            <div className="text-[14px] leading-relaxed text-ivory-dim">
              {stage === 4
                ? "Nothing needs your approval yet. CREATE_CASE, VERIFY_WITH_CUSTOMER and MONITOR_CONNECTED_CARDS are auto actions the agent may take alone."
                : "Waiting for the cardholder to answer the customer_validation request (simulated)."}
              <Link href="/investigate/assessment" className="btn-quiet mt-6 block w-fit rounded-xl px-4 py-2 text-[14px] text-ivory">
                {stage === 4 ? "Ask the cardholder" : "Watch for the response"}
              </Link>
            </div>
          )}
        </section>
      </div>
      {ready && rawAnswer && (
        <div className="mt-5 space-y-5">
          <div className="flex items-center gap-2 text-[12.5px] text-ivory-faint">
            <SourceBadge source={answer.source} /> Case outcome and SAR for {c?.case_id || caseId}
          </div>
          <div className="grid gap-5 xl:grid-cols-2">
            <EvidenceRequests a={rawAnswer} />
            <StopReason a={rawAnswer} />
          </div>
          <SarPanel a={rawAnswer} />
        </div>
      )}
    </>
  );
}
