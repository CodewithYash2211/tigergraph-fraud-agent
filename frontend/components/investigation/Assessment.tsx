"use client";

import { AnimatePresence, motion } from "motion/react";
import clsx from "clsx";

const ARC = "M 20 110 A 90 90 0 0 1 200 110";

/** The assessment currently retains the transaction's existing risk_score; it is not calibrated. */
export function RiskDial({ value, previous }: { value: number | null; previous?: number | null }) {
  const v = value === null ? 0 : Math.round(value * 100);
  const prev = previous != null ? Math.round(previous * 100) : undefined;
  const band = value === null ? "Score not reported" : value >= 0.85 ? "High score band" : value <= 0.15 ? "Low score band" : "Mid-range score";
  const color = value === null ? "#777783" : value >= 0.85 ? "#E25564" : value <= 0.15 ? "#4F8A6B" : "#E86B7A";
  return (
    <div className="mx-auto w-full max-w-[300px]">
      <div className="relative">
        <svg viewBox="0 0 220 124" className="w-full overflow-visible" aria-hidden>
          {[0.15, 0.85].map((t) => {
            const a = Math.PI - t * Math.PI;
            return <line key={t} x1={110 + 102 * Math.cos(a)} y1={110 - 102 * Math.sin(a)} x2={110 + 86 * Math.cos(a)} y2={110 - 86 * Math.sin(a)} stroke="#1E1E2D" strokeOpacity=".45" strokeWidth="1.2" />;
          })}
          <path d={ARC} fill="none" stroke="rgba(30,30,45,.08)" strokeWidth="7" strokeLinecap="round" />
          {prev !== undefined && <path d={ARC} fill="none" stroke="rgba(30,30,45,.18)" strokeWidth="7" strokeLinecap="round" pathLength={1} strokeDasharray={`${prev / 100} 1`} />}
          <motion.path d={ARC} fill="none" strokeWidth="7" strokeLinecap="round"
            initial={{ pathLength: prev !== undefined ? prev / 100 : 0 }} animate={{ pathLength: v / 100, stroke: color }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }} />
        </svg>
        <div className="absolute inset-x-0 bottom-[-6px] text-center">
          <div className="font-display text-[42px] leading-none tnum">{value === null ? "–" : value.toFixed(2)}</div>
        </div>
      </div>
      <div className="mt-4 text-center text-[12px] text-ivory-faint">Existing transaction risk_score · 0–1 scale</div>
      <div className="mt-1 flex items-center justify-center gap-2 text-[13px]">
        <span className="h-1.5 w-1.5 rounded-full" style={{ background: color }} />
        <span style={{ color }}>{band}</span>
        {previous !== undefined && previous !== null && <span className="text-ivory-faint">{prev === v ? "same value in initial and final views" : `initial value ${previous.toFixed(2)}`}</span>}
      </div>
    </div>
  );
}

/** The bank model score, shown apart from the assessment on purpose. */
export function BankScore({ score, trigger }: { score: number | null; trigger?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl bg-slate px-4 py-3 ring-1 ring-line">
      <div>
        <div className="text-[12px] text-ivory-faint">Existing transaction risk_score</div>
        <div className="mt-0.5 font-display text-[22px] leading-none tnum">{score === null ? "–" : score.toFixed(2)}</div>
      </div>
      <p className="max-w-[230px] text-right text-[12px] leading-snug text-ivory-dim">
        {score === null ? `Not reported for ${trigger ?? "this"} trigger. ` : ""}This dataset score is a reason to investigate, not a calibrated fraud probability or a verdict.
      </p>
    </div>
  );
}

/** Stop rule (policy section 6): >= 0.85 or <= 0.15 with two independent pieces of evidence. */
export function ConfidenceMeter({
  value,
  stage,
  evidence = [],
}: {
  value: number;
  stage: number;
  evidence?: any[];
}) {
  const ev = (evidence || []).filter((e) => e.stage <= stage);
  const sources = new Set(ev.filter((e) => e.strength === "strong").map((e) => e.source)).size;
  const inStop = value >= 0.85 || value <= 0.15;
  const met = inStop && sources >= 2;
  const v = value * 100;
  return (
    <div>
      <div className="flex items-baseline justify-between gap-3">
        <div className="text-[13px] font-medium">Backend assessment threshold check</div>
        <span className={clsx("font-display text-[13px] font-medium", met ? "text-sage" : "text-champagne")}>{met ? "Threshold and evidence condition met" : "Condition not met"}</span>
      </div>
      <div className="relative mt-4 h-2.5 rounded-full bg-ivory/[0.06]">
        <div className="absolute inset-y-0 left-0 w-[15%] rounded-l-full bg-sage/25" />
        <div className="absolute inset-y-0 right-0 w-[15%] rounded-r-full bg-crimson/20" />
        <motion.div className="absolute -top-1.5 h-5 w-1 -translate-x-1/2 rounded-full bg-ivory" initial={{ left: "0%" }} animate={{ left: `${v}%` }} transition={{ duration: 1.4, ease: [0.22, 1, 0.36, 1] }} />
      </div>
      <div className="mt-2 flex justify-between text-[11.5px] text-ivory-faint"><span>0.15 lower threshold</span><span>0.85 upper threshold</span></div>
      <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-[13px]">
        <span className="flex items-center gap-2">
          <span className="flex gap-1">{[0, 1].map((i) => <span key={i} className={clsx("h-3 w-1 rounded-full", i < sources ? "bg-ivory" : "bg-ivory/15")} />)}</span>
          {sources} of 2 independent sources
        </span>
        <span className="text-ivory-faint">{ev.length} findings so far</span>
      </div>
    </div>
  );
}

export function AgentTrace({
  stage,
  running,
  detailed = false,
  events,
}: {
  stage: number;
  running: boolean;
  detailed?: boolean;
  events: any[];
}) {
  const formatEventTime = (value: string) => {
    const date = new Date(value);
    if (!value || !Number.isFinite(date.getTime())) return null;
    return {
      date: new Intl.DateTimeFormat(undefined, { month: "short", day: "2-digit", year: "2-digit" }).format(date),
      time: new Intl.DateTimeFormat(undefined, { hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(date),
    };
  };
  const sourceEvents = events;
  const activeEvents = sourceEvents.filter((e) => e.stage <= stage);
  const next = sourceEvents.find((e) => e.stage === stage + 1);
  return (
    <ol className="relative">
      <AnimatePresence initial={false}>
        {activeEvents.map((e, i) => {
          const eventTime = formatEventTime(e.t);
          return (
          <motion.li
            key={e.id}
            layout
            initial={{ opacity: 0, x: -10 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.55, delay: 0.05 * (i % 3) }}
            className="relative grid min-w-0 grid-cols-[minmax(4.25rem,5.25rem)_0.75rem_minmax(0,1fr)] gap-x-2 pb-6 sm:grid-cols-[minmax(6rem,7rem)_1rem_minmax(0,1fr)] sm:gap-x-3"
          >
            <time dateTime={Number.isFinite(new Date(e.t).getTime()) ? e.t : undefined} title={e.t}
              className="min-w-0 break-words pt-0.5 text-right text-[10px] leading-4 text-ivory-faint [overflow-wrap:anywhere] tnum sm:text-[12px]">
              {eventTime ? <><span className="block">{eventTime.date}</span><span className="block">{eventTime.time}</span></> : e.t || "Time not reported"}
            </time>
            <span className="relative flex justify-center">
              <span className={clsx("relative z-10 mt-1.5 h-2.5 w-2.5 rounded-full ring-4 ring-white",
                i === activeEvents.length - 1 ? "bg-champagne" : "bg-ivory/70")} />
              {i < activeEvents.length - 1 || next ? (
                <motion.span
                  className="absolute top-3 w-px bg-ivory/15"
                  initial={{ height: 0 }}
                  animate={{ height: "calc(100% + 12px)" }}
                  transition={{ duration: 0.6 }}
                />
              ) : null}
            </span>
            <div className="min-w-0">
              <div className="break-words text-[12px] text-champagne [overflow-wrap:anywhere]">{e.step}</div>
              <div className="mt-0.5 break-words text-[14.5px] leading-snug text-ivory [overflow-wrap:anywhere]">{e.title}</div>
              <p className="mt-1 break-words text-[13px] leading-relaxed text-ivory-dim [overflow-wrap:anywhere]">{e.detail}</p>
              {detailed && (
                <code className="mt-2 block w-fit max-w-full whitespace-normal break-all rounded-md bg-slate px-2 py-1 font-display text-[11px] text-ivory-dim ring-1 ring-line">{e.tool}</code>
              )}
            </div>
          </motion.li>
          );
        })}
      </AnimatePresence>
      {running && next && (
          <motion.li initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid min-w-0 grid-cols-[minmax(4.25rem,5.25rem)_0.75rem_minmax(0,1fr)] gap-x-2 sm:grid-cols-[minmax(6rem,7rem)_1rem_minmax(0,1fr)] sm:gap-x-3">
          <span />
          <span className="flex justify-center">
            <motion.span
              className="mt-1.5 h-2.5 w-2.5 rounded-full bg-champagne"
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{ repeat: Infinity, duration: 1.2 }}
            />
          </span>
          <div className="space-y-2">
            <div className="text-[13px] text-ivory-dim">{next.step}…</div>
            <div className="skeleton h-3 w-2/3" />
          </div>
        </motion.li>
      )}
    </ol>
  );
}

/** Evidence reported by the backend. It does not report per-signal score weights. */
export function RiskContributions({
  stage,
  probability,
  evidence = [],
}: {
  stage: number;
  probability?: number | null;
  evidence?: { id: string; title: string; source: string; stage: number }[];
}) {
  const rows = evidence.filter((e) => e.stage <= stage);
  return (
    <div>
      <div className="mb-3 text-[13px] text-ivory-faint">Reported assessment evidence · no per-signal weights are returned</div>
      {rows.length === 0 ? (
        <p className="text-[13px] leading-relaxed text-ivory-dim">
          No evidence reported yet. The backend does not report per-signal weights.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((e, i) => (
            <motion.li key={e.id} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 * i }}
              className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 text-[13px]">
              <span className="truncate text-ivory-dim">{e.title}</span>
              <span className="rounded-full px-2 py-0.5 text-[11px] capitalize text-ivory-dim ring-1 ring-ivory/12">{e.source}</span>
            </motion.li>
          ))}
        </ul>
      )}
      <div className="mt-3 flex justify-between border-t hairline pt-2 text-[13px]">
        <span className="text-ivory-faint">Existing risk_score input</span>
        <span className="tnum">{probability != null ? probability.toFixed(2) : "Not reported"}</span>
      </div>
    </div>
  );
}
