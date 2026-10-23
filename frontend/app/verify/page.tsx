"use client";

import { AnimatePresence, motion, useAnimationControls } from "motion/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GateFrame } from "@/components/GateFrame";
import { useInvestigation } from "@/lib/state/investigation";

type N = { id: string; x: number; y: number; label: string; kind: "pay" | "card" | "person" | "shop" | "device" | "other" };
const NODES: N[] = [
  { id: "pay", x: 170, y: 170, label: "$4,850 payment", kind: "pay" },
  { id: "card", x: 70, y: 80, label: "Card •4417", kind: "card" },
  { id: "owner", x: 60, y: 260, label: "Card owner", kind: "person" },
  { id: "shop", x: 200, y: 50, label: "Merchant", kind: "shop" },
  { id: "device", x: 320, y: 180, label: "Android phone", kind: "device" },
  { id: "loc", x: 250, y: 300, label: "Location", kind: "other" },
  { id: "o1", x: 440, y: 90, label: "Card •9031", kind: "card" },
  { id: "o2", x: 470, y: 190, label: "Card •2276", kind: "card" },
  { id: "o3", x: 435, y: 290, label: "Card •6640", kind: "card" },
];
const LINKS = [["pay", "card"], ["card", "owner"], ["pay", "shop"], ["pay", "device"], ["device", "o1"], ["device", "o2"], ["device", "o3"], ["device", "loc"]];
const PATH = new Set(["pay-device", "device-o1", "device-o2", "device-o3"]);
const pos = (id: string) => NODES.find((n) => n.id === id)!;

export default function VerifyPage() {
  const router = useRouter();
  const { hydrated, verified, authed, verify } = useInvestigation();
  const [state, setState] = useState<"idle" | "wrong" | "checking" | "done">("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const shake = useAnimationControls();

  useEffect(() => {
    if (hydrated && authed) router.replace("/investigate");
    else if (hydrated && verified && state === "idle") router.replace("/verify/check");
  }, [hydrated, authed, verified, state, router]);

  const pick = (id: string) => {
    if (state === "checking" || state === "done") return;
    setPicked(id);
    if (id !== "device") {
      setState("wrong");
      shake.start({ x: [0, -8, 8, -5, 5, 0], transition: { duration: 0.4 } });
      return;
    }
    setState("checking");
    setTimeout(() => setState("done"), 1300);
    setTimeout(() => { verify(); router.push("/verify/check"); }, 3300);
  };

  const solved = state === "checking" || state === "done";

  return (
    <GateFrame step={0}>
      <div className="w-full max-w-[640px]">
        <AnimatePresence mode="wait">
          {state !== "done" ? (
            <motion.div key="q" exit={{ opacity: 0, y: -10 }}>
              <h1 className="font-display text-[clamp(28px,4vw,38px)] leading-[1.1]">Verify you&rsquo;re human</h1>
              <p className="mt-3 max-w-md text-[15px] leading-relaxed text-ivory-dim">
                Before we open the investigation workspace, let&rsquo;s verify this session. Confirm the suspicious connection: select the entity that links this payment to three other people&rsquo;s cards.
              </p>
            </motion.div>
          ) : (
            <motion.div key="ok" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
              <h1 className="font-display text-[clamp(28px,4vw,38px)] leading-[1.1]">Human verification complete</h1>
              <p className="mt-3 text-[15px] text-ivory-dim">Session verified. Preparing your investigation workspace.</p>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.div animate={shake} className="relative mt-8">
          <motion.div
            className="sheet relative overflow-hidden"
            animate={state === "done" ? { scale: 1.04, opacity: 0.9 } : { scale: 1, opacity: 1 }}
            transition={{ duration: 1.6, ease: [0.22, 1, 0.36, 1] }}
          >
            <svg viewBox="0 0 540 350" className="w-full" role="group" aria-label="Verification graph">
              {LINKS.map(([a, b], i) => {
                const A = pos(a), B = pos(b);
                const hot = solved && PATH.has(`${a}-${b}`);
                return (
                  <motion.line key={i} x1={A.x} y1={A.y} x2={B.x} y2={B.y} strokeWidth={hot ? 1.8 : 1.1}
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1, stroke: hot ? "#E25564" : "rgba(30,30,45,0.168)" }}
                    transition={{ pathLength: { delay: 0.2 + i * 0.08, duration: 0.6 }, stroke: { duration: 0.5 } }} />
                );
              })}
              {NODES.map((n, i) => {
                const isPicked = picked === n.id;
                const wrong = isPicked && state === "wrong";
                const right = n.id === "device" && solved;
                const clickable = n.id !== "pay";
                return (
                  <motion.g key={n.id} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.1 + i * 0.07 }} style={{ transformOrigin: `${n.x}px ${n.y}px` }}>
                    <g role={clickable ? "button" : undefined} tabIndex={clickable ? 0 : -1} aria-label={clickable ? `Select ${n.label}` : undefined}
                      onClick={() => clickable && pick(n.id)} onKeyDown={(e) => clickable && (e.key === "Enter" || e.key === " ") && pick(n.id)}
                      className={clickable ? "cursor-pointer outline-none [&:focus-visible>circle:first-child]:stroke-champagne" : ""}>
                      <circle cx={n.x} cy={n.y} r={n.kind === "pay" ? 26 : 20} fill={n.kind === "pay" ? "#FDF1F3" : "#FFFFFF"}
                        stroke={right ? "#E25564" : wrong ? "#E25564" : n.kind === "pay" ? "#E86B7A" : "rgba(30,30,45,0.18)"} strokeWidth={right ? 2 : 1.2}
                        className="transition-[stroke] hover:stroke-[#E86B7A]" />
                      {right && (
                        <motion.circle cx={n.x} cy={n.y} r={20} fill="none" stroke="#E25564" initial={{ r: 20, opacity: 0.8 }}
                          animate={{ r: 38, opacity: 0 }} transition={{ repeat: 2, duration: 1 }} />
                      )}
                      <text x={n.x} y={n.y + 4} textAnchor="middle" fill={n.kind === "pay" ? "#E86B7A" : "#1E1E2D"} style={{ font: "600 11px var(--font-sans)" }}>
                        {{ pay: "$", card: "▭", person: "◯", shop: "⌂", device: "▯", other: "◎" }[n.kind]}
                      </text>
                      <text x={n.x} y={n.y + (n.kind === "pay" ? 44 : 36)} textAnchor="middle" fill="#6B6B7A" style={{ font: "500 11.5px var(--font-sans)" }}>{n.label}</text>
                    </g>
                  </motion.g>
                );
              })}
            </svg>
          </motion.div>
        </motion.div>

        <div className="mt-6 flex min-h-[48px] items-center gap-4">
          <div className="relative h-10 w-10 shrink-0">
            <svg viewBox="0 0 40 40" className="h-10 w-10 -rotate-90">
              <circle cx="20" cy="20" r="17" fill="none" stroke="rgba(30,30,45,0.072)" strokeWidth="2.5" />
              <motion.circle cx="20" cy="20" r="17" fill="none" stroke="#E86B7A" strokeWidth="2.5" strokeLinecap="round"
                initial={{ pathLength: 0 }} animate={{ pathLength: state === "idle" || state === "wrong" ? 0.08 : state === "checking" ? 0.7 : 1 }}
                transition={{ duration: state === "checking" ? 1.2 : 0.5 }} />
            </svg>
            <AnimatePresence>
              {state === "done" && (
                <motion.svg viewBox="0 0 40 40" className="absolute inset-0 h-10 w-10">
                  <motion.path d="M13 20.5 L18 25.5 L27.5 15" fill="none" stroke="#E86B7A" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"
                    initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.4 }} />
                </motion.svg>
              )}
            </AnimatePresence>
          </div>
          <AnimatePresence mode="wait">
            <motion.p key={state} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0 }} className="text-[14px] text-ivory-dim" aria-live="polite">
              {state === "idle" && "Tap or press Enter on an entity."}
              {state === "wrong" && <span className="text-crimson">That one only connects to the owner&rsquo;s own activity. Look for the entity with three other cards around it.</span>}
              {state === "checking" && "Checking the connection"}
              {state === "done" && "Verified. One more quick check."}
            </motion.p>
          </AnimatePresence>
        </div>
      </div>
    </GateFrame>
  );
}
