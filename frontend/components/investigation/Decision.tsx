"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, Check, CircleHelp, ShieldAlert, Sparkles, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import clsx from "clsx";
import type { Decision, NextBestAction } from "@/lib/types";

export function Recommendation({
  version,
  showCompare,
  onVersion,
  nba,
  whatChanged,
  comparisonNote,
  comparisonLabels = { before: "Initial policy", after: "Final policy" },
  scoreAvailable = true,
}: {
  version: "before" | "after";
  showCompare: boolean;
  onVersion?: (v: "before" | "after") => void;
  nba: Record<"before" | "after", NextBestAction>;
  whatChanged?: string;
  comparisonNote?: string;
  comparisonLabels?: Record<"before" | "after", string>;
  scoreAvailable?: boolean;
}) {
  const n = nba[version];
  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <span className="inline-flex items-center gap-2 rounded-full bg-champagne/12 px-3 py-1 text-[12.5px] text-champagne ring-1 ring-champagne/25">
          <Sparkles size={13} /> AI recommendation, not an action
        </span>
        {showCompare && (
          <div className="relative flex rounded-full bg-graphite/60 p-1 ring-1 ring-ivory/10" role="tablist" aria-label="Recommendation version">
            {(["before", "after"] as const).map((v) => (
              <button
                key={v}
                role="tab"
                aria-selected={version === v}
                onClick={() => onVersion?.(v)}
                className={clsx("relative z-10 rounded-full px-3 py-1 text-[12.5px] transition-colors", version === v ? "text-graphite" : "text-ivory-dim")}
              >
                {version === v && (
                  <motion.span layoutId="nba-toggle" className="absolute inset-0 -z-10 rounded-full bg-ivory" />
                )}
                {comparisonLabels[v]}
              </button>
            ))}
          </div>
        )}
      </div>

      <AnimatePresence mode="wait">
        <motion.div
          key={version}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          transition={{ duration: 0.45 }}
        >
          {showCompare && comparisonNote && <p className="mt-4 text-[12.5px] leading-relaxed text-ivory-faint">{comparisonNote}</p>}
          <div className="mt-6 eyebrow !text-ivory-faint">Recommended action</div>
          <h2 className="mt-1 font-display text-[clamp(28px,3vw,42px)] leading-[1.05]">
            {n.headline}
          </h2>
          {n.secondary.length > 0 && (
            <ul className="mt-4 flex flex-wrap gap-2">
              {n.secondary.map((s, i) => (
                <li key={`${s}-${i}`} className="rounded-full px-3 py-1 text-[13px] text-ivory-dim ring-1 ring-ivory/12">{s}</li>
              ))}
            </ul>
          )}

          <div className="mt-6 flex flex-wrap items-end gap-x-10 gap-y-4 border-y hairline py-5">
            <div>
              <div className="text-[12px] text-ivory-faint">Assessment input score</div>
              <div className={clsx("font-display text-[30px] leading-none tnum", n.probability !== null && n.probability >= 0.85 ? "text-crimson" : "text-champagne")}>{scoreAvailable && n.probability !== null ? n.probability.toFixed(2) : "Not reported"}</div>
              <div className="mt-1 max-w-[210px] text-[11px] leading-snug text-ivory-faint">Existing transaction risk_score used as the assessment input; it is not a calibrated probability.</div>
            </div>
            <div>
              <div className="text-[12px] text-ivory-faint">Policy rules</div>
              <div className="mt-1 font-display text-[16px]">{n.rules.length ? n.rules.join(", ") : "Not reported"}</div>
            </div>
            <div className="min-w-[220px] flex-1">
            <div className="text-[12px] text-ivory-faint">Recommended approval route</div>
              <div className="mt-1 text-[14px] text-ivory">{n.approval}</div>
            </div>
          </div>

          <div className="mt-6">
            <div className="mb-2 text-[13px] text-ivory-faint">Recommended actions and routes · nothing executed here</div>
            <ol className="divide-y divide-line overflow-hidden rounded-xl ring-1 ring-line">
              {n.actions.map((a, i) => (
                <motion.li key={`${a.action}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.06 }}
                  className="grid gap-1 bg-white/70 px-4 py-3 sm:grid-cols-[210px_90px_1fr] sm:items-baseline sm:gap-4">
                  <span className="font-display text-[13px] font-medium">{a.action}</span>
                  <span className={clsx("w-fit rounded-full px-2 py-0.5 font-display text-[11px] ring-1",
                    a.route === "auto" ? "text-ivory-dim ring-line" : a.route === "L1" ? "text-champagne ring-champagne/40" : "text-crimson ring-crimson/40")}>{a.route}</span>
                  <span className="text-[13px] leading-snug text-ivory-dim">{a.reason}</span>
                </motion.li>
              ))}
            </ol>
          </div>

          <div className="mt-6 grid gap-8 md:grid-cols-[1.4fr_1fr]">
            <div>
              <div className="mb-3 text-[13px] text-ivory-faint">Why the agent recommends this</div>
              <ol className="space-y-3">
                {n.reasoning.map((r, i) => (
                  <motion.li
                    key={`${n.version}-${i}-${r}`}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 + i * 0.12 }}
                    className="flex gap-3 text-[14.5px] leading-relaxed"
                  >
                    <span className="mt-[3px] grid h-5 w-5 shrink-0 place-items-center rounded-full bg-ivory/[0.07] text-[11px] text-ivory-dim tnum">{i + 1}</span>
                    {r}
                  </motion.li>
                ))}
              </ol>
            </div>
            <div className="rounded-2xl bg-slate p-4 ring-1 ring-line">
              <div className="flex items-center gap-2 text-[13px] text-champagne">
                <CircleHelp size={15} /> What the agent is unsure about
              </div>
              <p className="mt-2 text-[14px] leading-relaxed text-ivory-dim">{n.uncertainty}</p>
              {version === "after" && whatChanged && (
                <p className="mt-3 border-t hairline pt-3 text-[13px] leading-relaxed text-ivory-dim">
                  <span className="font-medium text-ivory">Backend comparison: </span>{whatChanged}
                </p>
              )}
            </div>
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

const CHAIN = [
  { label: "AI investigates", by: "agent" },
  { label: "AI recommends", by: "agent" },
  { label: "Analyst reviews", by: "human" },
  { label: "Analyst decides", by: "human" },
];

const REASONS = ["Customer confirmed the payment", "Evidence insufficient", "Wrong action or route"];

export function ApprovalPanel({
  decision, decidedAt, rejectReason, onDecide, caseId, waitingNote,
}: {
  decision: Decision;
  decidedAt: string | null;
  rejectReason: string | null;
  onDecide: (d: "approved" | "rejected" | "review", reason?: string) => void;
  caseId: string;
  /** what is waiting for approval, from the live recommendation */
  waitingNote?: string;
}) {
  const [rejecting, setRejecting] = useState(false);
  const pos = decision === "pending" ? 2 : 4;

  return (
    <div>
      {/* human-in-the-loop chain */}
      <ol className="grid grid-cols-4 gap-2">
        {CHAIN.map((c, i) => {
          const done = i < pos;
          const now = i === pos;
          return (
            <li key={c.label} className="relative">
              <motion.div
                className={clsx("h-1 rounded-full", c.by === "agent" ? "bg-ivory/60" : "bg-champagne")}
                initial={false}
                animate={{ opacity: done ? 1 : now ? 0.6 : 0.15 }}
              />
              <div className={clsx("mt-2 text-[12px] leading-tight", done || now ? "text-ivory" : "text-ivory-faint")}>
                {c.label}
              </div>
              {now && (
                <motion.div className="absolute -top-0.5 left-0 h-2 w-2 rounded-full bg-champagne"
                  animate={{ left: ["0%", "95%"] }} transition={{ repeat: Infinity, duration: 2, ease: "easeInOut", repeatType: "mirror" }} />
              )}
            </li>
          );
        })}
      </ol>

      <AnimatePresence mode="wait">
        {decision === "pending" ? (
          <motion.div key="pending" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0, y: -6 }} className="mt-7">
            <div className="flex items-center gap-3">
              <span className="relative flex h-2.5 w-2.5">
                <span className="absolute inset-0 animate-ping rounded-full bg-champagne/70" />
                <span className="relative h-2.5 w-2.5 rounded-full bg-champagne" />
              </span>
              <span className="text-[15px] text-champagne">Awaiting analyst approval</span>
            </div>
            <p className="mt-2 text-[14px] leading-relaxed text-ivory-dim">
              Nothing has been executed. {waitingNote ? `The backend recommends: ${waitingNote}. ` : "No approval route was reported. "}These controls only update this browser session; they do not create an approval queue or execute a card, transaction, or reporting action.
            </p>

            <AnimatePresence mode="wait">
              {!rejecting ? (
                <motion.div key="btns" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="mt-6 flex flex-wrap gap-3">
                  <button onClick={() => onDecide("approved")} className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] font-medium">
                    <Check size={16} /> Approve
                  </button>
                  <button onClick={() => setRejecting(true)} className="inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px] text-crimson ring-1 ring-crimson/35 hover:bg-crimson/10">
                    <X size={16} /> Reject
                  </button>
                  <button onClick={() => onDecide("review")} className="btn-quiet inline-flex items-center gap-2 rounded-xl px-5 py-3 text-[14px]">
                    <ArrowUpRight size={16} /> Escalate
                  </button>
                  <Link href="/intelligence/evidence" className="inline-flex items-center px-2 py-3 text-[14px] text-ivory-dim underline-offset-4 hover:text-ivory hover:underline">
                    Review evidence
                  </Link>
                </motion.div>
              ) : (
                <motion.div key="reasons" initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }} className="mt-6">
                  <div className="mb-3 text-[13px] text-ivory-faint">Choose a reason to record with this browser-session decision.</div>
                  <div className="flex flex-wrap gap-2">
                    {REASONS.map((r) => (
                      <button key={r} onClick={() => onDecide("rejected", r)}
                        className="rounded-full px-3.5 py-1.5 text-[13px] ring-1 ring-ivory/15 hover:bg-ivory/[0.06]">
                        {r}
                      </button>
                    ))}
                    <button onClick={() => setRejecting(false)} className="px-3 py-1.5 text-[13px] text-ivory-faint hover:text-ivory">Cancel</button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        ) : (
          <motion.div key="done" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-7">
            <div className="flex items-center gap-3">
              <span className={clsx("grid h-8 w-8 place-items-center rounded-full", decision === "approved" ? "bg-sage/20 text-sage" : decision === "review" ? "bg-champagne/15 text-champagne" : "bg-crimson/15 text-crimson")}>
                {decision === "approved" ? <Check size={16} /> : <ShieldAlert size={16} />}
              </span>
              <div>
                <div className="text-[15px]">{decision === "approved" ? "Approved" : decision === "review" ? "Escalated" : "Rejected"} by you{decidedAt ? ` at ${decidedAt}` : ""}</div>
                {rejectReason && <div className="text-[13px] text-ivory-faint">Reason: {rejectReason}</div>}
              </div>
            </div>
            <ul className="mt-5 space-y-2.5">
              {(decision === "approved"
                ? [`Analyst choice for ${caseId} recorded in this browser session`, "No approval queue or downstream action was called"]
                : decision === "review"
                  ? [`Escalation choice for ${caseId} recorded in this browser session`, "No fraud-manager queue item was created"]
                  : ["No action executed", `Rejection choice for ${caseId} recorded in this browser session`, "No backend case-memory entry was written"]
              ).map((a, i) => (
                <motion.li key={`${a}-${i}`} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + i * 0.15 }}
                  className="flex items-center gap-3 text-[14px] text-ivory-dim">
                  <Check size={14} className="text-sage" /> {a}
                  <span className="text-[12px] text-ivory-faint">session only</span>
                </motion.li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="/replay" className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium">Replay the investigation</Link>
              <Link href="/cases/memory" className="btn-quiet rounded-xl px-5 py-2.5 text-[14px]">Browse historical case memory</Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
