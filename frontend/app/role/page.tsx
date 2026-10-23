"use client";

import { motion } from "motion/react";
import { ArrowRight, Briefcase, UserRound } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { GateFrame } from "@/components/GateFrame";
import { useInvestigation } from "@/lib/state/investigation";

const ROLES = [
  { id: "customer" as const, icon: UserRound, title: "Customer", body: "See your account, recent activity and the status of a transaction under review. Internal investigation details stay private.", href: "/customer" },
  { id: "analyst" as const, icon: Briefcase, title: "Analyst", body: "Investigate the 20-case pack: graph, evidence, fraud probability, next best action, approvals and SARs.", href: "/overview" },
];

export default function RolePage() {
  const router = useRouter();
  const { hydrated, authed, setRole } = useInvestigation();
  useEffect(() => { if (hydrated && !authed) router.replace("/verify"); }, [hydrated, authed, router]);

  return (
    <GateFrame step={3}>
      <div className="w-full max-w-[720px]">
        <h1 className="font-display text-[clamp(28px,4vw,38px)] leading-[1.1]">Choose a workspace</h1>
        <p className="mt-3 text-[15px] text-ivory-dim">The role decides what you can see. You can switch from the account menu.</p>
        <div className="mt-8 grid gap-4 sm:grid-cols-2">
          {ROLES.map((r, i) => {
            const Icon = r.icon;
            return (
              <motion.button key={r.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0, transition: { delay: i * 0.08 } }}
                onClick={() => { setRole(r.id); router.push(r.href); }}
                className="sheet group flex flex-col items-start p-6 text-left transition-shadow hover:shadow-[0_24px_50px_-28px_rgba(226,85,100,.5)] hover:ring-1 hover:ring-champagne/40">
                <span className="grid h-11 w-11 place-items-center rounded-full bg-white ring-1 ring-line"><Icon size={19} strokeWidth={1.6} /></span>
                <span className="mt-5 font-display text-[20px]">{r.title}</span>
                <span className="mt-2 text-[14px] leading-relaxed text-ivory-dim">{r.body}</span>
                <span className="mt-5 inline-flex items-center gap-1.5 text-[14px] text-champagne">Continue <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
              </motion.button>
            );
          })}
        </div>
      </div>
    </GateFrame>
  );
}
