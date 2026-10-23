"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import type { CaseStatus, Decision } from "@/lib/types";

export const PROGRESSION = ["Detected", "Investigating", "Evidence gathered", "Recommendation ready", "Human review", "Decision"];

export function progressFromStage(stage: number, decision: Decision) {
  if (decision === "approved" || decision === "rejected") return 5;
  if (stage >= 7) return 4;
  if (stage >= 4) return 3;
  if (stage >= 2) return 2;
  if (stage >= 1) return 1;
  return 0;
}

export function progressFromStatus(s: CaseStatus) {
  return ({ New: 0, Investigating: 1, "Evidence found": 2, "Pattern identified": 2, "Risk assessed": 2, "Awaiting evidence": 2,
    "Recommendation ready": 3, "Awaiting approval": 4, Reviewed: 5, Complete: 5 } as Record<CaseStatus, number>)[s];
}

/** Labelled case lifecycle: every step named, the current one lit. */
export function CaseProgress({ at }: { at: number }) {
  return (
    <ol className="grid grid-cols-6 gap-2" aria-label="Case progression">
      {PROGRESSION.map((p, i) => (
        <li key={p} aria-current={i === at ? "step" : undefined}>
          <div className="h-1 overflow-hidden rounded-full bg-ivory/10">
            <motion.div className={clsx("h-full rounded-full", i === 5 && at === 5 ? "bg-sage" : "bg-champagne")}
              initial={{ width: 0 }} animate={{ width: i <= at ? "100%" : "0%" }} transition={{ delay: i * 0.08, duration: 0.6 }} />
          </div>
          <div className={clsx("mt-2 text-[11.5px] leading-tight sm:text-[12.5px]", i === at ? "text-champagne" : i < at ? "text-ivory-dim" : "text-ivory-faint")}>{p}</div>
        </li>
      ))}
    </ol>
  );
}
