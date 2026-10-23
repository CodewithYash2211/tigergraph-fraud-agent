"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogOut, Menu, Search, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BRAND } from "@/lib/brand";
import { GROUPS, SECTIONS, clean, sectionKey } from "./navConfig";
import { useInvestigation } from "@/lib/state/investigation";
import { openSearch } from "@/components/CommandPalette";

export function BrandMark({ size = 22 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" aria-hidden>
      <line x1="5" y1="17" x2="12" y2="6" stroke="#E86B7A" strokeWidth="1.4" />
      <line x1="12" y1="6" x2="19" y2="15" stroke="#1E1E2D" strokeOpacity=".5" strokeWidth="1.4" />
      <line x1="5" y1="17" x2="19" y2="15" stroke="#E25564" strokeWidth="1.4" />
      <circle cx="12" cy="6" r="3" fill="#E86B7A" />
      <circle cx="5" cy="17" r="2.4" fill="#1E1E2D" />
      <circle cx="19" cy="15" r="2.4" fill="#E25564" />
    </svg>
  );
}

export const ANALYST = { name: "Demo Analyst", initials: "DA", role: "Fraud analyst (demo account)" };

function UserChip() {
  const { signOut } = useInvestigation();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const on = (e: MouseEvent) => ref.current && !ref.current.contains(e.target as Node) && setOpen(false);
    document.addEventListener("mousedown", on);
    return () => document.removeEventListener("mousedown", on);
  }, []);
  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen((o) => !o)} aria-expanded={open} aria-label="Account"
        className="flex items-center gap-2.5 rounded-full py-1 pl-1 pr-3 ring-1 ring-ivory/10 transition-colors hover:bg-ivory/[0.05]">
        <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-champagne to-champagne-deep text-[11px] font-semibold text-white">{ANALYST.initials}</span>
        <span className="hidden text-[13px] text-ivory-dim xl:block">Analyst workspace</span>
      </button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0, y: -6 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -6 }}
            className="absolute right-0 mt-2 w-64 overflow-hidden rounded-xl bg-white ring-1 ring-line shadow-xl">
            <div className="border-b hairline px-4 py-3">
              <div className="text-[14px]">{ANALYST.name}</div>
              <div className="text-[12px] text-ivory-faint">{ANALYST.role}</div>
              <div className="mt-2 flex items-center gap-2 text-[12px] text-ivory-dim">
                <span className="h-1.5 w-1.5 rounded-full bg-sage" /> Verified demo session
              </div>
            </div>
            <Link href="/role" className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-ivory-dim hover:bg-ivory/[0.05] hover:text-ivory">Switch role</Link>
            <button onClick={() => { signOut(); router.push("/"); }} className="flex w-full items-center gap-2 px-4 py-3 text-left text-[13px] text-ivory-dim hover:bg-ivory/[0.05] hover:text-ivory">
              <LogOut size={14} /> Sign out
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Navbar({ variant = "app" }: { variant?: "landing" | "app" }) {
  const pathname = usePathname();
  const active = variant === "app" ? sectionKey(pathname) : null;
  const { stage, decision, authed, hydrated, role } = useInvestigation();
  const [open, setOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => setOpen(false), [pathname]);
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 8);
    on();
    window.addEventListener("scroll", on, { passive: true });
    return () => window.removeEventListener("scroll", on);
  }, []);

  const cta = variant === "landing"
    ? { href: authed ? "/role" : "/verify", label: "Enter workspace" }
    : !authed
    ? { href: "/verify", label: "Start Investigation" }
    : role === "customer"
      ? { href: "/customer", label: "My account" }
      : role === null
        ? { href: "/role", label: "Choose workspace" }
      : stage === 0
        ? { href: "/investigate", label: "Start Investigation" }
        : decision !== "pending"
          ? { href: "/replay", label: "Replay case" }
          : { href: stage >= 4 ? "/investigate/decision" : "/investigate", label: "Resume case" };

  const sectionHref = (href: string) => (href.startsWith("/#") || authed || variant === "app" ? href : "/verify");

  return (
    <>
      <header
        className={clsx(
          "fixed inset-x-0 top-0 z-50 transition-[background,border-color] duration-500",
          variant === "app" || scrolled ? "border-b hairline bg-graphite/85 backdrop-blur-xl" : "border-b border-transparent",
        )}
        style={{ paddingTop: "env(safe-area-inset-top, 0px)" }}
      >
        <nav className="mx-auto flex h-16 items-center gap-4 px-4 sm:px-6 lg:px-8" aria-label="Primary">
          <Link href="/" className="flex items-center gap-2.5">
            <BrandMark />
            <span className="font-display text-[15px] font-semibold tracking-[-0.02em]">{BRAND.name}</span>
            <span className="hidden text-[13px] text-ivory-faint xl:inline">{BRAND.product}</span>
          </Link>

          <ul className="ml-4 hidden items-center gap-0.5 md:flex lg:ml-10">
            {SECTIONS.map((s) => {
              const on = active === s.key;
              return (
                <li key={s.key} className="relative">
                  <Link href={sectionHref(s.href)}
                    className={clsx("relative z-10 block rounded-full px-3 py-2 text-[14px] transition-colors lg:px-4", on ? "text-ivory" : "text-ivory-dim hover:text-ivory")}>
                    {s.label}
                  </Link>
                  {on && (
                    <motion.span layoutId="nav-pill" className="absolute inset-0 rounded-full bg-white ring-1 ring-line shadow-sm"
                      transition={{ type: "spring", stiffness: 380, damping: 32 }} />
                  )}
                </li>
              );
            })}
          </ul>

          <div className="ml-auto flex items-center gap-2">
            {variant === "app" && (
              <button onClick={openSearch} aria-label="Search"
                className="flex h-9 items-center gap-2 rounded-full bg-white/70 px-3 text-[13px] text-ivory-dim ring-1 ring-line transition-colors hover:bg-white hover:text-ivory">
                <Search size={15} />
                <span className="hidden lg:inline">Search</span>
                <span className="hidden rounded px-1 font-display text-[11px] text-ivory-faint ring-1 ring-line lg:inline">⌘K</span>
              </button>
            )}
            {hydrated && !authed && (
              <Link href="/signin" className="hidden rounded-[10px] px-3.5 py-2 text-[14px] text-ivory-dim transition-colors hover:text-ivory md:block">Sign in</Link>
            )}
            {hydrated && authed && <div className="hidden md:block"><UserChip /></div>}
            <Link href={cta.href} className="btn-primary hidden rounded-[10px] px-4 py-2 text-[14px] font-medium transition-colors md:block">
              {cta.label}
            </Link>
            <button className="grid h-9 w-9 place-items-center rounded-full btn-quiet md:hidden" onClick={() => setOpen((v) => !v)}
              aria-label={open ? "Close menu" : "Open menu"} aria-expanded={open}>
              {open ? <X size={17} /> : <Menu size={17} />}
            </button>
          </div>
        </nav>
      </header>

      <AnimatePresence>
        {open && (
          <motion.div className="fixed inset-0 z-40 md:hidden" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
            <div className="absolute inset-0 bg-ivory/20 backdrop-blur-[2px]" onClick={() => setOpen(false)} />
            <motion.nav aria-label="Menu" initial={{ x: "-100%" }} animate={{ x: 0 }} exit={{ x: "-100%" }} transition={{ type: "spring", stiffness: 340, damping: 36 }}
              className="absolute inset-y-0 left-0 w-[86%] max-w-[360px] overflow-y-auto border-r hairline bg-graphite px-6 pb-10 pt-20 shadow-2xl">
              {GROUPS.map((g, i) => (
                <motion.div key={g.key} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0, transition: { delay: 0.05 * i } }} className="border-b hairline py-4">
                  <div className="eyebrow !text-ivory-faint">{g.label}</div>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {g.items.map((it) => (
                      <li key={it.href}>
                        <Link href={sectionHref(it.href)}
                          className={clsx("block rounded-full px-3 py-1.5 text-[13px] ring-1",
                            clean(pathname) === it.href ? "bg-champagne/15 text-champagne ring-champagne/30" : "text-ivory-dim ring-ivory/10")}>
                          {it.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              ))}
              {!authed && <Link href="/signin" className="btn-quiet mt-8 block rounded-xl px-5 py-3 text-center">Sign in</Link>}
              <Link href={cta.href} className="btn-primary mt-3 block rounded-xl px-5 py-3 text-center font-medium">{cta.label}</Link>
            </motion.nav>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
