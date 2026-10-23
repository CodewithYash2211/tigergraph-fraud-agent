"use client";

import { AnimatePresence, motion } from "motion/react";
import { Check, Lock, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { GateFrame } from "@/components/GateFrame";
import { useInvestigation } from "@/lib/state/investigation";

const SEQ = ["Securing session", "Loading case pack", "Ready"];

export default function SignInPage() {
  const router = useRouter();
  const { hydrated, verified, secured, authed, signIn } = useInvestigation();
  const [email, setEmail] = useState("demo@tigergraph-fraud.demo");
  const [pw, setPw] = useState("demo-analyst");
  const [err, setErr] = useState<string | null>(null);
  const [phase, setPhase] = useState(-1);

  useEffect(() => {
    if (!hydrated || phase >= 0) return;
    if (authed) router.replace("/role");
    else if (!verified) router.replace("/verify");
    else if (!secured) router.replace("/verify/check");
  }, [hydrated, verified, secured, authed, phase, router]);

  const go = (skipCheck = false) => {
    if (!skipCheck) {
      if (!/^\S+@\S+\.\S+$/.test(email)) return setErr("Enter your work email, for example name@bank.com.");
      if (pw.length < 4) return setErr("Enter your password. Any password of 4+ characters works in the demo.");
    }
    setErr(null);
    setPhase(0);
    setTimeout(() => setPhase(1), 900);
    setTimeout(() => setPhase(2), 1800);
    setTimeout(() => { signIn(); router.push("/role"); }, 2600);
  };

  return (
    <GateFrame step={2}>
      <div className="w-full max-w-[420px]">
        <AnimatePresence mode="wait">
          {phase < 0 ? (
            <motion.div key="form" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}>
              <div className="flex items-center gap-2 text-[13px] text-sage"><ShieldCheck size={15} /> Human verification complete</div>
              <h1 className="mt-4 font-display text-[clamp(28px,4vw,38px)] leading-[1.1]">Secure access</h1>
              <p className="mt-3 text-[15px] leading-relaxed text-ivory-dim">Demo sign-in. Nothing is checked against a real identity provider; demo credentials are filled in.</p>
              <form className="mt-8 space-y-4" onSubmit={(e) => { e.preventDefault(); go(); }} noValidate>
                <label className="block">
                  <span className="text-[12.5px] text-ivory-faint">Work email</span>
                  <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username"
                    className="mt-1.5 w-full rounded-xl bg-slate/80 px-4 py-3 text-[15px] ring-1 ring-ivory/12 focus:outline-none focus:ring-champagne/60" />
                </label>
                <label className="block">
                  <span className="text-[12.5px] text-ivory-faint">Password</span>
                  <input type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoComplete="current-password"
                    className="mt-1.5 w-full rounded-xl bg-slate/80 px-4 py-3 text-[15px] ring-1 ring-ivory/12 focus:outline-none focus:ring-champagne/60" />
                </label>
                <AnimatePresence>
                  {err && <motion.p initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="text-[13px] text-crimson" role="alert">{err}</motion.p>}
                </AnimatePresence>
                <button type="submit" className="btn-primary w-full rounded-xl py-3 text-[15px] font-medium">Sign in</button>
                <button type="button" onClick={() => go(true)} className="btn-quiet w-full rounded-xl py-3 text-[15px]">Continue with demo account</button>
              </form>
              <div className="mt-6 flex items-start gap-2 text-[12.5px] leading-relaxed text-ivory-faint">
                <Lock size={13} className="mt-0.5 shrink-0" /> Frontend-only demo session, stored in this browser tab. No real authentication happens.
              </div>
            </motion.div>
          ) : (
            <motion.div key="seq" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="py-10">
              <ul className="space-y-4">
                {SEQ.map((s, i) => (
                  <motion.li key={s} initial={{ opacity: 0, x: -8 }} animate={{ opacity: i <= phase ? 1 : 0.25, x: 0 }} transition={{ delay: i * 0.05 }}
                    className="flex items-center gap-3 font-display text-[24px]">
                    <span className="grid h-6 w-6 place-items-center">
                      {i < phase || (i === 2 && phase === 2) ? <Check size={18} className="text-champagne" /> : i === phase ? (
                        <motion.span className="h-2 w-2 rounded-full bg-champagne" animate={{ opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 0.8 }} />
                      ) : <span className="h-2 w-2 rounded-full bg-ivory/20" />}
                    </span>
                    {s}{i === phase && i < 2 ? "…" : ""}
                  </motion.li>
                ))}
              </ul>
              <div className="mt-8 h-px bg-ivory/10"><motion.div className="h-px bg-champagne" animate={{ width: `${((phase + 1) / 3) * 100}%` }} /></div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </GateFrame>
  );
}
