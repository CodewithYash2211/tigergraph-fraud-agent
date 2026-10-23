"use client";

import Link from "next/link";
import clsx from "clsx";
import type { ReactNode } from "react";
import { BrandMark } from "@/components/nav/Navbar";
import { BRAND } from "@/lib/brand";

const STEPS = ["Verify", "Security check", "Sign in", "Role"];

/** Shared chrome for the verification and sign-in checkpoints. */
export function GateFrame({ step, children }: { step: 0 | 1 | 2 | 3; children: ReactNode }) {
  return (
    <main className="relative flex min-h-dvh flex-col">
      <div className="pointer-events-none absolute inset-0" style={{ background: "radial-gradient(900px 600px at 50% 30%, rgba(232,107,122,0.08), transparent 70%)" }} />
      <header className="relative flex h-16 items-center justify-between px-5 sm:px-8">
        <Link href="/" className="flex items-center gap-2.5"><BrandMark /><span className="font-display text-[15px] font-semibold">{BRAND.name}</span></Link>
        <ol className="flex items-center gap-2 text-[12px] sm:text-[12.5px]" aria-label="Session steps">
          {STEPS.map((s, i) => (
            <li key={s} className="flex items-center gap-2">
              <span className={clsx(i !== step && "hidden sm:inline", i < step ? "text-ivory-dim" : i === step ? "text-champagne" : "text-ivory-faint/60")}>{s}</span>
              {i < STEPS.length - 1 && <span className={clsx("hidden h-px w-6 sm:block", i < step ? "bg-ivory/40" : "bg-ivory/12")} />}
            </li>
          ))}
        </ol>
      </header>
      <div className="relative flex flex-1 items-center justify-center px-5 pb-16 pt-6">{children}</div>
      <footer className="relative pb-6 text-center text-[12px] text-ivory-faint">Demo checkpoint. No real identity or security checks are performed.</footer>
    </main>
  );
}
