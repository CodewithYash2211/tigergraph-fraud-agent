"use client";

import { animate, motion, useInView, useMotionValue, useTransform } from "motion/react";
import { useEffect, useRef, type ReactNode } from "react";
import clsx from "clsx";
import Link from "next/link";
import { AlertTriangle, SearchX, Inbox } from "lucide-react";
import type { EvidenceStrength, RiskBand } from "@/lib/types";

export function PageHeader({
  title, desc, context, actions,
}: { title: string; desc?: ReactNode; context?: ReactNode; actions?: ReactNode }) {
  return (
    <header className="mb-8 flex flex-wrap items-end justify-between gap-6">
      <div className="max-w-2xl">
        {context && <div className="mb-3 text-[13px] text-ivory-faint">{context}</div>}
        <h1 className="font-display text-[clamp(26px,2.8vw,36px)] leading-[1.1]">{title}</h1>
        {desc && <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ivory-dim">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}

export function Counter({ to, duration = 1.4, className }: { to: number; duration?: number; className?: string }) {
  const mv = useMotionValue(0);
  const rounded = useTransform(mv, (v) => Math.round(v).toString());
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: false });
  useEffect(() => {
    if (!inView) return;
    const c = animate(mv, to, { duration, ease: [0.22, 1, 0.36, 1] });
    return () => c.stop();
  }, [to, inView, duration, mv]);
  return <motion.span ref={ref} className={clsx("tnum", className)}>{rounded}</motion.span>;
}

const BAND = {
  high: "text-crimson bg-crimson/12 ring-crimson/30",
  medium: "text-champagne bg-champagne/12 ring-champagne/25",
  low: "text-ivory-dim bg-ivory/[0.06] ring-ivory/15",
};

export function BandTag({ band }: { band: RiskBand }) {
  return (
    <span className={clsx("inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[12px] font-medium ring-1", BAND[band])}>
      <span className="h-1.5 w-1.5 rounded-full bg-current" />
      {band === "high" ? "High risk" : band === "medium" ? "Medium risk" : "Low risk"}
    </span>
  );
}

const STRENGTH = {
  strong: "bg-crimson",
  contextual: "bg-champagne",
  weak: "bg-ivory-faint",
};

export function StrengthMark({ s }: { s: EvidenceStrength }) {
  const n = s === "strong" ? 3 : s === "contextual" ? 2 : 1;
  return (
    <span className="inline-flex items-center gap-2 text-[12px] text-ivory-faint" title={`${s} signal`}>
      <span className="flex gap-0.5">
        {[0, 1, 2].map((i) => (
          <span key={i} className={clsx("h-2.5 w-1 rounded-full", i < n ? STRENGTH[s] : "bg-ivory/15")} />
        ))}
      </span>
      <span className="capitalize">{s}</span>
    </span>
  );
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={clsx("skeleton", className)} />;
}

export function StatePanel({
  kind, title, body, action,
}: {
  kind: "empty" | "error" | "noresults";
  title: string;
  body: string;
  action?: { label: string; href?: string; onClick?: () => void };
}) {
  const Icon = kind === "error" ? AlertTriangle : kind === "noresults" ? SearchX : Inbox;
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="flex flex-col items-center px-6 py-16 text-center"
    >
      <div className={clsx(
        "mb-5 grid h-12 w-12 place-items-center rounded-2xl ring-1",
        kind === "error" ? "bg-crimson/10 text-crimson ring-crimson/25" : "bg-ivory/[0.05] text-ivory-dim ring-ivory/10",
      )}>
        <Icon size={20} strokeWidth={1.6} />
      </div>
      <h3 className="font-display text-2xl">{title}</h3>
      <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-ivory-dim">{body}</p>
      {action &&
        (action.href ? (
          <Link href={action.href} className="btn-quiet mt-6 rounded-xl px-4 py-2 text-[14px]">{action.label}</Link>
        ) : (
          <button onClick={action.onClick} className="btn-quiet mt-6 rounded-xl px-4 py-2 text-[14px]">{action.label}</button>
        ))}
    </motion.div>
  );
}

/** Shown when a page is visited before the investigation has reached it. */
export function NotYet({ title, body, onJump, jumpLabel }: { title: string; body: string; onJump: () => void; jumpLabel: string }) {
  return (
    <div className="sheet">
      <div className="flex flex-col items-center px-6 py-20 text-center">
        <div className="relative mb-6 h-14 w-14">
          <span className="absolute inset-0 rounded-full border border-champagne/40" />
          <motion.span
            className="absolute inset-0 rounded-full border-t border-champagne"
            animate={{ rotate: 360 }}
            transition={{ repeat: Infinity, duration: 2.4, ease: "linear" }}
          />
        </div>
        <h2 className="font-display text-3xl">{title}</h2>
        <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ivory-dim">{body}</p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link href="/investigate" className="btn-quiet rounded-xl px-5 py-2.5 text-[14px]">Go to studio</Link>
          <button onClick={onJump} className="btn-primary rounded-xl px-5 py-2.5 text-[14px] font-medium">{jumpLabel}</button>
        </div>
      </div>
    </div>
  );
}

export function Kbd({ children }: { children: ReactNode }) {
  return <span className="rounded-md bg-ivory/[0.07] px-1.5 py-0.5 text-[11px] text-ivory-dim ring-1 ring-ivory/10">{children}</span>;
}
