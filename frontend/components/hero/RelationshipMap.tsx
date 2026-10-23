"use client";

import { motion } from "motion/react";
import clsx from "clsx";
import { AlertTriangle, Building2, CreditCard, FileWarning, MapPin, Smartphone, UserRound, type LucideIcon } from "lucide-react";

/**
 * The TigerGraph signature: one suspicious transaction and the six things it is connected to.
 * Every line starts at the transaction; the three suspicious ones turn coral once they are "found".
 */

const W = 760;
const H = 600;
const C = { x: 380, y: 285 };

type Side = "below" | "right" | "left" | "above";
interface Node {
  id: string;
  x: number;
  y: number;
  label: string;
  sub: string;
  icon: LucideIcon;
  suspicious?: boolean;
  side: Side;
  from: [number, number];
  edge: string;
  edgeAt: [number, number];
  t: number;
  rotate?: number;
}

const NODES: Node[] = [
  { id: "merchant", x: 380, y: 80, label: "Merchant", sub: "first visit", icon: Building2, side: "right", from: [C.x, C.y], edge: "merchant", edgeAt: [392, 165], t: 0.9 },
  { id: "card", x: 105, y: C.y, label: "Card", sub: "ending 4417", icon: CreditCard, side: "below", from: [C.x, C.y], edge: "paid with", edgeAt: [185, C.y - 12], t: 1.05 },
  { id: "account", x: 655, y: C.y, label: "Account", sub: "5-year customer", icon: UserRound, side: "below", from: [C.x, C.y], edge: "linked account", edgeAt: [575, C.y - 12], t: 1.2 },
  { id: "device", x: 380, y: 430, label: "Device", sub: "new, shared by 4 cards", icon: Smartphone, suspicious: true, side: "right", from: [C.x, C.y], edge: "used device", edgeAt: [392, 382], t: 1.35 },
  { id: "location", x: 380, y: 545, label: "Location", sub: "148 km from home", icon: MapPin, suspicious: true, side: "right", from: [380, 458], edge: "occurred at", edgeAt: [392, 502], t: 1.6 },
  { id: "case", x: 636, y: 468, label: "Previous case", sub: "confirmed fraud", icon: FileWarning, suspicious: true, side: "below", from: [C.x, C.y], edge: "seen in earlier fraud", edgeAt: [556, 398], t: 1.5, rotate: 35.6 },
];

const MUTED = "#D9BFC5";
const CORAL = "#E86B7A";
const ALARM_AT = 2.6;

const pct = (x: number, y: number) => ({ left: `${(x / W) * 100}%`, top: `${(y / H) * 100}%` });

export function RelationshipMap({ intro = true, className }: { intro?: boolean; className?: string }) {
  const d = (t: number) => (intro ? t : 0);
  const dur = (t: number) => (intro ? t : 0.001);

  return (
    <div className={clsx("relative aspect-[760/600] w-full select-none", className)} role="img"
      aria-label="A suspicious transaction connected to a card, an account and a merchant, and suspiciously to a new shared device, an unusual location and a previous fraud case">
      <div className="pointer-events-none absolute rounded-full" style={{ ...pct(C.x - 230, C.y - 200), width: "60%", height: "66%", background: "radial-gradient(closest-side, rgba(243,166,177,.35), rgba(243,166,177,0))" }} />

      <svg viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full overflow-visible" aria-hidden>
        {NODES.map((n) => (
          <motion.line
            key={n.id}
            x1={n.from[0]} y1={n.from[1]} x2={n.x} y2={n.y}
            strokeWidth={n.suspicious ? 1.8 : 1.4}
            strokeLinecap="round"
            initial={{ pathLength: 0, stroke: MUTED }}
            animate={{ pathLength: 1, stroke: n.suspicious ? CORAL : MUTED }}
            transition={{
              pathLength: { delay: d(n.t), duration: dur(0.7), ease: [0.22, 1, 0.36, 1] },
              stroke: { delay: d(n.suspicious ? ALARM_AT : 0), duration: dur(0.8) },
            }}
          />
        ))}
        {NODES.map((n) => (
          <motion.text key={`l-${n.id}`} x={n.edgeAt[0]} y={n.edgeAt[1]} textAnchor={n.id === "card" || n.id === "account" || n.rotate ? "middle" : "start"}
            transform={n.rotate ? `rotate(${n.rotate} ${n.edgeAt[0]} ${n.edgeAt[1]})` : undefined}
            fill={n.suspicious ? CORAL : "#8a8290"} className="max-sm:hidden" style={{ font: "500 11px var(--font-sans)", letterSpacing: ".01em" }}
            initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(n.suspicious ? ALARM_AT + 0.3 : n.t + 0.6), duration: dur(0.6) }}>
            {n.edge}
          </motion.text>
        ))}
        {/* one quiet pulse along the suspicious chain */}
        <circle r="3.5" fill={CORAL} opacity="0">
          <animate attributeName="opacity" values="0;1;1;0;0" keyTimes="0;.04;.4;.45;1" dur="6s" begin={intro ? "3.6s" : "0.5s"} repeatCount="indefinite" />
          <animateMotion path={`M ${C.x} ${C.y + 60} L 380 430 L 380 545`} dur="6s" begin={intro ? "3.6s" : "0.5s"} repeatCount="indefinite" keyPoints="0;1;1" keyTimes="0;.45;1" calcMode="linear" />
        </circle>
      </svg>

      {NODES.map((n) => {
        const Icon = n.icon;
        return (
          <div key={n.id} className="absolute" style={pct(n.x, n.y)}>
            <motion.div initial={{ opacity: 0, scale: 0.6 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: d(n.t + 0.5), duration: dur(0.5), ease: [0.22, 1, 0.36, 1] }}
              className="absolute -translate-x-1/2 -translate-y-1/2">
              <motion.div
                className="grid h-10 w-10 place-items-center rounded-full border bg-white sm:h-14 sm:w-14"
                initial={{ borderColor: "#EAD6DA", color: "#1E1E2D", boxShadow: "0 6px 16px -8px rgba(120,60,72,.25)" }}
                animate={n.suspicious
                  ? { borderColor: CORAL, color: CORAL, boxShadow: "0 0 0 6px rgba(232,107,122,.12), 0 6px 16px -8px rgba(120,60,72,.25)" }
                  : { borderColor: "#EAD6DA", color: "#1E1E2D" }}
                transition={{ delay: d(n.suspicious ? ALARM_AT : 0), duration: dur(0.8) }}
              >
                <Icon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.6} />
              </motion.div>
            </motion.div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(n.t + 0.7), duration: dur(0.5) }}
              className={clsx("absolute w-max",
                n.side === "below" && "left-0 top-7 -translate-x-1/2 text-center sm:top-10",
                n.side === "right" && "left-7 top-0 -translate-y-1/2 sm:left-10")}>
              <div className="text-[11px] font-semibold text-ivory sm:text-[13.5px]">{n.label}</div>
              <div className={clsx("hidden text-[12px] sm:block", n.suspicious ? "text-champagne" : "text-ivory-faint")}>{n.sub}</div>
            </motion.div>
          </div>
        );
      })}

      {/* the suspicious transaction */}
      <div className="absolute -translate-x-1/2 -translate-y-1/2" style={pct(C.x, C.y)}>
        <motion.div initial={{ opacity: 0, scale: 0.9, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} transition={{ delay: d(0.3), duration: dur(0.8), ease: [0.22, 1, 0.36, 1] }}
          className="relative">
          <motion.span className="absolute -inset-2 rounded-[18px] border border-champagne/30 sm:-inset-3 sm:rounded-[22px]"
            animate={{ opacity: [0.2, 0.7, 0.2], scale: [0.98, 1.02, 0.98] }} transition={{ repeat: Infinity, duration: 3.6, ease: "easeInOut", delay: d(ALARM_AT) }} />
          <div className="relative flex flex-col items-center rounded-xl border border-champagne bg-white px-2.5 py-2 shadow sm:rounded-2xl-[0_24px_50px_-24px_rgba(226,85,100,.55)] sm:px-7 sm:py-5">
            <AlertTriangle className="h-3.5 w-3.5 text-champagne sm:h-5 sm:w-5" strokeWidth={1.8} />
            <div className="mt-1.5 whitespace-nowrap font-display text-[8.5px] font-semibold uppercase tracking-[0.06em] sm:text-[13px] sm:tracking-[0.08em]">Suspicious transaction</div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: d(ALARM_AT), duration: dur(0.6) }}
              className="mt-2 rounded-full bg-champagne/12 px-2 py-0.5 text-[9px] font-semibold text-crimson sm:px-2.5 sm:text-[12px]">High risk</motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
