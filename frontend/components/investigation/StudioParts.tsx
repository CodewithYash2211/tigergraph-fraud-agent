"use client";

import { AnimatePresence, motion } from "motion/react";
import { ChevronDown, X } from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import { STAGES } from "@/lib/data/stages";
import { getTransaction } from "@/lib/data/adapter";
import Link from "next/link";
import { Expand } from "lucide-react";
import type { Evidence, GraphEntity, GraphRelation } from "@/lib/types";
import { StrengthMark } from "@/components/ui/primitives";

/** Lifecycle rail. Only the current step is labelled; others reveal on hover. */
export function StageRail({
  stage, onPick, done = false, className,
}: { stage: number; onPick?: (i: number) => void; done?: boolean; className?: string }) {
  return (
    <ol className={clsx("flex w-full items-center", className)} aria-label="Investigation progress">
      {STAGES.map((s, i) => {
        const past = i < stage || done;
        const now = i === stage && !done;
        return (
          <li key={s.key} className={clsx("group relative flex items-center", i < STAGES.length - 1 && "flex-1")}>
            <button
              type="button"
              disabled={!onPick}
              onClick={() => onPick?.(i)}
              aria-label={s.label}
              aria-current={now ? "step" : undefined}
              className={clsx("relative grid h-5 w-5 shrink-0 place-items-center rounded-full", onPick ? "cursor-pointer" : "cursor-default")}
            >
              <motion.span
                className="block rounded-full"
                animate={{
                  width: now ? 12 : 7,
                  height: now ? 12 : 7,
                  backgroundColor: now ? "#E86B7A" : past ? "#1E1E2D" : "rgba(30,30,45,0.108)",
                }}
              />
              {now && (
                <motion.span
                  className="absolute inset-0 rounded-full ring-1 ring-champagne/60"
                  animate={{ scale: [1, 1.6], opacity: [0.8, 0] }}
                  transition={{ repeat: Infinity, duration: 1.8 }}
                />
              )}
              <span
                className={clsx(
                  "pointer-events-none absolute left-1/2 top-full mt-2 -translate-x-1/2 whitespace-nowrap text-[12px] transition-opacity",
                  now ? "text-champagne opacity-100" : "text-ivory-dim opacity-0 group-hover:opacity-100",
                )}
              >
                {s.label}
              </span>
            </button>
            {i < STAGES.length - 1 && (
              <span className="relative mx-1 h-px flex-1 bg-ivory/12">
                <motion.span
                  className="absolute inset-y-0 left-0 bg-ivory/60"
                  initial={false}
                  animate={{ width: past ? "100%" : "0%" }}
                  transition={{ duration: 0.8 }}
                />
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function EvidenceItem({
  ev, onHover, defaultOpen = false, fresh = false,
}: { ev: Evidence; onHover?: (ids: string[] | null) => void; defaultOpen?: boolean; fresh?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <motion.li
      layout
      initial={fresh ? { opacity: 0, y: 14, filter: "blur(6px)" } : false}
      animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
      transition={{ duration: 0.6 }}
      onMouseEnter={() => onHover?.(ev.entities)}
      onMouseLeave={() => onHover?.(null)}
      className="border-b hairline last:border-b-0"
    >
      <button
        className="flex w-full items-start gap-3 py-3.5 text-left"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span
          className={clsx(
            "mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full",
            ev.strength === "strong" ? "bg-crimson" : ev.strength === "contextual" ? "bg-champagne" : "bg-ivory-faint",
          )}
        />
        <span className="min-w-0 flex-1">
          <span className="block text-[14px] leading-snug text-ivory">{ev.title}</span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 text-[12px] text-ivory-faint">
            <span className={clsx("font-medium", ev.strength === "strong" ? "text-crimson" : "text-ivory-dim")}>{ev.strength === "strong" ? "High relevance" : ev.strength === "contextual" ? "Supporting" : "Low relevance"}</span>
            <span aria-hidden>/</span><span>{ev.source}</span>
            <span aria-hidden>/</span><span className="tnum">{ev.time}</span>
          </span>
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} className="mt-0.5 text-ivory-faint">
          <ChevronDown size={15} />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="pb-4 pl-[18px]">
              <p className="text-[13.5px] leading-relaxed text-ivory-dim">{ev.detail}</p>
              <div className="mt-3 flex flex-wrap items-center gap-3">
                <StrengthMark s={ev.strength} />
                <span className="text-[12px] text-ivory-dim tnum">{ev.confidence === null ? "Confidence not reported" : `${ev.confidence}% confidence in this finding`}</span>
                <code className="rounded-md bg-slate px-2 py-1 font-display text-[11px] text-ivory-dim ring-1 ring-ivory/10">{ev.query}</code>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.li>
  );
}

export function EvidenceFeed({
  stage,
  onHover,
  evidence = [],
}: {
  stage: number;
  onHover?: (ids: string[] | null) => void;
  evidence?: Evidence[];
}) {
  const items = evidence.filter((e) => e.stage <= stage);
  const latest = Math.max(...items.map((i) => i.stage), -1);
  return (
    <ul>
      {items.map((ev) => (
        <EvidenceItem key={ev.id} ev={ev} onHover={onHover} fresh={ev.stage === latest} />
      ))}
    </ul>
  );
}

export function NodeInspector({
  id,
  onClose,
  onExpand,
  hidden = 0,
  entities = [],
  evidence = [],
  relations = [],
}: {
  id: string;
  onClose: () => void;
  onExpand?: () => void;
  hidden?: number;
  entities?: GraphEntity[];
  evidence?: Evidence[];
  relations?: GraphRelation[];
}) {
  const e = entities.find((x) => x.id === id);
  if (!e) return null;
  const linked = evidence.filter((ev) => ev.entities.includes(id));
  const connected = relations.filter((relation) => relation.source === id || relation.target === id);
  const kind = ({ transaction: "Transaction", account: "Card", customer: "Customer", device: "Device", merchant: "Merchant", location: "Region", email: "Email entity", case: "Prior case" } as const)[e.kind];
  const txn = e.kind === "transaction" ? getTransaction(e.label.replace("TXN ", "")) : undefined;
  return (
    <motion.div
      key={id}
      initial={{ opacity: 0, x: 16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 16 }}
      className="flex h-full flex-col"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <span className={clsx("inline-flex rounded-full border px-3 py-1.5 text-[12px] font-semibold uppercase tracking-[0.1em]", e.flagged ? "border-crimson/35 bg-crimson/10 text-crimson" : "border-violet-300/25 bg-violet-300/10 text-violet-200")}>{kind}</span>
          <h3 className="mt-3 break-all font-display text-[26px] font-semibold leading-tight tracking-tight text-ivory tnum sm:text-[29px]">{e.label}</h3>
          <div className={clsx("mt-2 break-words text-[14px] leading-relaxed", e.flagged ? "text-crimson" : "text-ivory-dim")}>{e.sub}</div>
        </div>
        <button onClick={onClose} className="grid h-8 w-8 place-items-center rounded-full btn-quiet" aria-label="Close details">
          <X size={15} />
        </button>
      </div>
      {e.note && <p className="mt-4 rounded-xl border border-line bg-slate/35 px-3.5 py-3 text-[13px] leading-relaxed text-ivory-dim">{e.note}</p>}
      {(txn || (onExpand && hidden > 0) || e.kind === "case") && (
        <div className="mt-5">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ivory-faint">Available actions</div>
          <div className="flex flex-wrap gap-2">
          {onExpand && hidden > 0 && (
            <button onClick={onExpand} className="inline-flex min-h-9 items-center gap-2 rounded-lg px-3 py-2 text-[12.5px] font-medium text-champagne ring-1 ring-champagne/30 transition-colors hover:bg-champagne/10">
              <Expand size={13} /> Expand {hidden} hidden relationship{hidden > 1 ? "s" : ""}
            </button>
          )}
          {txn && (
            <Link href={`/transactions/${txn.txn_id}/`} className="inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-[12.5px] text-ivory-dim ring-1 ring-ivory/15 transition-colors hover:bg-ivory/[0.04] hover:text-ivory">Open transaction detail</Link>
          )}
          {e.kind === "case" && (
            <Link href="/cases/memory/" className="inline-flex min-h-9 items-center rounded-lg px-3 py-2 text-[12.5px] text-ivory-dim ring-1 ring-ivory/15 transition-colors hover:bg-ivory/[0.04] hover:text-ivory">Open in case memory</Link>
          )}
          </div>
        </div>
      )}
      <section className="mt-5 border-t hairline pt-4" aria-label="Relationships">
        <div className="mb-3 flex items-center justify-between gap-2">
          <h4 className="text-[12px] font-semibold uppercase tracking-[0.1em] text-ivory-faint">Returned relationships</h4>
          <span className="rounded-full bg-ivory/[0.06] px-2.5 py-1 text-[12px] text-ivory-dim tnum">{connected.length}</span>
        </div>
        {connected.length ? (
          <ul className="space-y-2">
            {connected.map((relation) => {
              const otherId = relation.source === id ? relation.target : relation.source;
              const other = entities.find((entity) => entity.id === otherId);
              return <li key={relation.id} className="flex min-w-0 items-center justify-between gap-3 rounded-xl border border-line bg-slate/30 px-3.5 py-3">
                <span className="min-w-0 truncate text-[14px] font-medium text-ivory">{other?.label || "Returned entity"}</span>
                <span className="shrink-0 rounded-full border border-violet-300/20 bg-violet-300/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-violet-200">{relation.edgeType || relation.label}</span>
              </li>;
            })}
          </ul>
        ) : <p className="rounded-xl border border-dashed border-line px-3 py-3 text-[12px] leading-relaxed text-ivory-faint">No verified relationship endpoints were returned for this entity.</p>}
      </section>
      <section className="mt-5 border-t hairline pt-4" aria-label="Entity details">
      <h4 className="mb-3 text-[12px] font-semibold uppercase tracking-[0.1em] text-ivory-faint">Entity details</h4>
      <dl className="space-y-2">
        {e.details.map((d) => (
          <div key={d.k} className="grid min-w-0 grid-cols-[minmax(100px,.8fr)_minmax(0,1.2fr)] items-start gap-3 rounded-lg bg-slate/30 px-3.5 py-3 text-[14px]">
            <dt className="text-[13px] leading-relaxed text-ivory-faint">{d.k}</dt>
            <dd className="break-all text-right font-medium leading-relaxed text-ivory tnum">{d.v}</dd>
          </div>
        ))}
      </dl>
      </section>
      {linked.length > 0 && (
        <div className="mt-5 border-t hairline pt-4">
          <div className="mb-2 text-[11px] font-semibold uppercase tracking-[0.1em] text-ivory-faint">Evidence involving this {kind.toLowerCase()}</div>
          <ul>
            {linked.map((ev) => (
              <EvidenceItem key={ev.id} ev={ev} />
            ))}
          </ul>
        </div>
      )}
    </motion.div>
  );
}
