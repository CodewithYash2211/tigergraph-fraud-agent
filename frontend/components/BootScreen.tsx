"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check } from "lucide-react";
import { useEffect, useState } from "react";
import { BrandMark } from "@/components/nav/Navbar";
import { BRAND } from "@/lib/brand";

const STEPS = [
  "Initializing investigation engine",
  "Mapping transaction relationships",
  "Correlating entities",
  "Checking historical evidence",
  "Preparing analyst workspace",
];
const STEP_MS = 620;
const KEY = "tg-booted";

function markBooted() {
  document.documentElement.dataset.booted = "1";
  window.dispatchEvent(new Event("tg:booted"));
}

/** True once the boot sequence has finished (immediately on later visits in the session). */
export function useBooted() {
  const [b, setB] = useState(false);
  useEffect(() => {
    if (document.documentElement.dataset.booted === "1") return setB(true);
    const on = () => setB(true);
    window.addEventListener("tg:booted", on);
    return () => window.removeEventListener("tg:booted", on);
  }, []);
  return b;
}

// a tiny network that forms as the steps complete
const PTS: [number, number][] = [[60, 60], [22, 30], [100, 26], [106, 88], [30, 96], [70, 112], [132, 58]];
const LINKS: [number, number][] = [[0, 1], [0, 2], [0, 3], [0, 4], [3, 5], [2, 6], [3, 6], [4, 5]];

export function BootScreen() {
  const [show, setShow] = useState(true);
  const [step, setStep] = useState(0);
  const [instant, setInstant] = useState(false);

  useEffect(() => {
    let booted = false;
    try {
      booted = sessionStorage.getItem(KEY) === "1";
    } catch {}
    if (booted || window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setInstant(true);
      setShow(false);
      markBooted();
      return;
    }
    const timers = STEPS.map((_, i) => setTimeout(() => setStep(i + 1), STEP_MS * (i + 1)));
    timers.push(setTimeout(() => {
      try { sessionStorage.setItem(KEY, "1"); } catch {}
      setShow(false);
      setTimeout(markBooted, 250);
    }, STEP_MS * STEPS.length + 500));
    return () => timers.forEach(clearTimeout);
  }, []);

  const progress = step / STEPS.length;

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          key="boot"
          className="fixed inset-0 z-[100] grid place-items-center bg-graphite"
          exit={instant ? { opacity: 0, transition: { duration: 0 } } : { opacity: 0, scale: 1.02, transition: { duration: 0.7 } }}
          role="status"
          aria-label="Loading TigerGraph Fraud Investigation"
        >
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(600px 400px at 50% 45%, rgba(232,107,122,0.1), transparent 70%)" }}
          />
          <div className="relative flex w-[min(420px,86vw)] flex-col items-center">
            <svg viewBox="0 0 150 130" className="h-[120px] w-[140px]" aria-hidden>
              {LINKS.map(([a, b], i) => {
                const on = step >= Math.min(STEPS.length, 1 + Math.floor(i / 2));
                const hot = i === 2 || i === 6;
                return (
                  <motion.line key={i} x1={PTS[a][0]} y1={PTS[a][1]} x2={PTS[b][0]} y2={PTS[b][1]}
                    stroke={hot && step >= 3 ? "#E25564" : "rgba(30,30,45,0.21)"} strokeWidth="1"
                    initial={{ pathLength: 0 }} animate={{ pathLength: on ? 1 : 0 }} transition={{ duration: 0.5 }} />
                );
              })}
              {PTS.map((p, i) => (
                <motion.circle key={i} cx={p[0]} cy={p[1]} r={i === 0 ? 5 : 3}
                  fill={i === 0 ? "#E86B7A" : i === 3 && step >= 3 ? "#E25564" : "#1E1E2D"}
                  initial={{ opacity: 0, scale: 0 }} animate={{ opacity: i === 0 || step >= Math.ceil(i / 1.6) ? 1 : 0, scale: 1 }}
                  transition={{ duration: 0.4 }} style={{ transformOrigin: `${p[0]}px ${p[1]}px` }} />
              ))}
            </svg>

            <div className="mt-4 flex items-center gap-2.5">
              <BrandMark size={20} />
              <span className="text-[17px] font-medium tracking-[-0.01em]">{BRAND.name}</span>
            </div>

            <div className="mt-8 h-6 w-full overflow-hidden text-center">
              <AnimatePresence mode="wait">
                <motion.div key={step} initial={{ y: 14, opacity: 0 }} animate={{ y: 0, opacity: 1 }} exit={{ y: -14, opacity: 0 }}
                  transition={{ duration: 0.3 }} className="font-display text-[19px] text-ivory">
                  {step < STEPS.length ? STEPS[step] : "Ready"}
                </motion.div>
              </AnimatePresence>
            </div>

            <div className="mt-5 h-px w-full bg-ivory/10">
              <motion.div className="h-px bg-champagne" animate={{ width: `${progress * 100}%` }} transition={{ duration: 0.5 }} />
            </div>

            <ul className="mt-5 w-full space-y-1.5">
              {STEPS.map((s, i) => (
                <li key={s} className="flex items-center justify-between text-[12px]">
                  <span className={i < step ? "text-ivory-dim" : i === step ? "text-ivory" : "text-ivory-faint/50"}>{s}</span>
                  {i < step ? <Check size={12} className="text-champagne" /> : i === step ? (
                    <motion.span className="h-1.5 w-1.5 rounded-full bg-champagne" animate={{ opacity: [0.2, 1, 0.2] }} transition={{ repeat: Infinity, duration: 0.9 }} />
                  ) : <span className="h-1.5 w-1.5" />}
                </li>
              ))}
            </ul>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
