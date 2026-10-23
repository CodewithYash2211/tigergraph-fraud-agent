"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Check, PanelLeftClose, PanelLeftOpen, RotateCcw } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import clsx from "clsx";
import { ALL_ITEMS, GROUPS, clean, type NavItem } from "./navConfig";
import { useInvestigation } from "@/lib/state/investigation";
import { LAST_STAGE } from "@/lib/data/stages";
import { PATTERN_LABEL } from "@/lib/data/labels";

const EXPANDED = 248;
const COLLAPSED = 72;

export function useMedia(query: string) {
  const [m, setM] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia(query);
    const on = () => setM(mq.matches);
    on();
    mq.addEventListener("change", on);
    return () => mq.removeEventListener("change", on);
  }, [query]);
  return m;
}

function Tip({ show, label, children }: { show: boolean; label: string; children: ReactNode }) {
  const [hover, setHover] = useState(false);
  return (
    <div
      className="relative"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onFocus={() => setHover(true)}
      onBlur={() => setHover(false)}
    >
      {children}
      <AnimatePresence>
        {show && hover && (
          <motion.div
            role="tooltip"
            initial={{ opacity: 0, x: -4 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -4 }}
            transition={{ duration: 0.15 }}
            className="pointer-events-none absolute left-full top-1/2 z-50 ml-3 -translate-y-1/2 whitespace-nowrap rounded-lg bg-ivory px-2.5 py-1.5 text-[12px] font-medium text-graphite shadow-xl"
          >
            {label}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function ProgressRing({ value }: { value: number }) {
  const r = 15;
  const c = 2 * Math.PI * r;
  return (
    <svg width="38" height="38" viewBox="0 0 38 38" aria-hidden>
      <circle cx="19" cy="19" r={r} fill="none" stroke="rgba(30,30,45,0.072)" strokeWidth="2.5" />
      <motion.circle
        cx="19" cy="19" r={r} fill="none" stroke="#E86B7A" strokeWidth="2.5" strokeLinecap="round"
        strokeDasharray={c} transform="rotate(-90 19 19)"
        animate={{ strokeDashoffset: c * (1 - value) }}
      />
    </svg>
  );
}

function activeHref(pathname: string) {
  const p = clean(pathname);
  const matches = ALL_ITEMS.filter((it) => p === it.href || p.startsWith(it.href + "/"));
  return matches.sort((a, b) => b.href.length - a.href.length)[0]?.href ?? null;
}

export function Sidebar() {
  const pathname = usePathname();
  const { stage, status, decision, sidebarCollapsed, setSidebarCollapsed, reset, caseId, answer } = useInvestigation();
  const isDesktop = useMedia("(min-width: 1024px)");
  // Tablet: rail by default, temporary overlay when expanded.
  const [tabletOpen, setTabletOpen] = useState(false);
  const collapsed = isDesktop ? sidebarCollapsed : !tabletOpen;
  const toggle = () => (isDesktop ? setSidebarCollapsed(!sidebarCollapsed) : setTabletOpen((v) => !v));
  useEffect(() => setTabletOpen(false), [pathname]);

  const activeId = caseId;
  const progress = decision !== "pending" ? 1 : stage / LAST_STAGE;
  const current = activeHref(pathname);

  const itemState = (it: NavItem) => {
    if (it.stage === undefined) return null;
    if (decision !== "pending" || (it.doneAt !== undefined && stage >= it.doneAt)) return "done";
    if (stage >= it.stage) return "open";
    return "later";
  };

  return (
    <>
      {!isDesktop && !collapsed && (
        <div className="fixed inset-0 top-16 z-30 hidden bg-graphite/40 backdrop-blur-[2px] md:block" onClick={toggle} />
      )}
      <motion.aside
        className="fixed bottom-0 left-0 top-16 z-40 hidden flex-col border-r hairline bg-[#FFFFFF]/92 backdrop-blur-xl md:flex"
        animate={{ width: collapsed ? COLLAPSED : EXPANDED }}
        initial={false}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
        aria-label="Workspace navigation"
      >
        {/* Active case */}
        <div className="px-3 pt-4">
          <Tip show={collapsed} label={`${activeId}, ${status}`}>
            <Link href={`/cases/${activeId}/`}
              className="flex items-center gap-3 overflow-hidden rounded-2xl p-2 ring-1 ring-ivory/[0.07] transition-colors hover:bg-ivory/[0.04]">
              <div className="relative shrink-0">
                <ProgressRing value={progress} />
                <span className="absolute inset-0 grid place-items-center text-[10px] tnum text-ivory-dim">
                  {decision !== "pending" ? <Check size={12} className="text-sage" /> : `${stage}/${LAST_STAGE}`}
                </span>
              </div>
              <AnimatePresence initial={false}>
                {!collapsed && (
                  <motion.div initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0, transition: { delay: 0.08 } }}
                    exit={{ opacity: 0, x: -6, transition: { duration: 0.1 } }} className="min-w-0">
                    <div className="truncate text-[13px] font-medium">{answer?.answer.live ? PATTERN_LABEL[answer.answer.case.pattern] : "Case review"}</div>
                    <div className="truncate text-[12px] text-ivory-faint tnum">{activeId}</div>
                    <div className="mt-0.5 truncate text-[12px] text-champagne">{status}</div>
                  </motion.div>
                )}
              </AnimatePresence>
            </Link>
          </Tip>
        </div>

        <div className="mt-4 flex-1 overflow-y-auto overflow-x-hidden px-3 pb-4 scroll-thin">
          {GROUPS.map((g) => (
            <div key={g.key} className="mt-3 first:mt-1">
              <div className="flex h-7 items-center px-3">
                {!collapsed ? (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="whitespace-nowrap text-[11.5px] text-ivory-faint">
                    {g.label}
                  </motion.span>
                ) : (
                  <span className="mx-auto h-px w-5 bg-ivory/12" />
                )}
              </div>
              <ul className="space-y-0.5">
                {g.items.map((it) => {
                  const on = current === it.href;
                  const st = itemState(it);
                  const Icon = it.icon;
                  return (
                    <li key={it.href}>
                      <Tip show={collapsed} label={it.label}>
                        <Link href={it.href} aria-current={on ? "page" : undefined}
                          className={clsx("group relative flex items-center gap-3 rounded-xl px-3 py-2 transition-colors",
                            on ? "text-ivory" : "text-ivory-dim hover:bg-ivory/[0.04] hover:text-ivory")}>
                          {on && (
                            <motion.span layoutId="side-active"
                              className="absolute inset-0 rounded-xl bg-gradient-to-r from-champagne/[0.16] to-champagne/[0.03] ring-1 ring-champagne/20"
                              transition={{ type: "spring", stiffness: 400, damping: 34 }} />
                          )}
                          <span className="relative grid h-5 w-5 shrink-0 place-items-center">
                            <Icon size={17} strokeWidth={1.6} className={on ? "text-champagne" : ""} />
                            {st === "done" && (
                              <span className="absolute -right-1.5 -top-1.5 grid h-3 w-3 place-items-center rounded-full bg-sage text-graphite">
                                <Check size={8} strokeWidth={3} />
                              </span>
                            )}
                            {st === "open" && !on && <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-champagne" />}
                          </span>
                          {!collapsed && (
                            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1, transition: { delay: 0.1 } }} className="relative min-w-0 whitespace-nowrap text-[13.5px]">
                              {it.label}
                            </motion.span>
                          )}
                        </Link>
                      </Tip>
                    </li>
                  );
                })}
              </ul>
            </div>
          ))}
        </div>

        <div className="space-y-1 border-t hairline p-3">
          <Tip show={collapsed} label="Reset session">
            <button onClick={reset} className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-ivory-dim transition-colors hover:bg-ivory/[0.04] hover:text-ivory">
              <RotateCcw size={16} strokeWidth={1.6} className="shrink-0" />
              {!collapsed && <span className="whitespace-nowrap text-[13px]">Reset session</span>}
            </button>
          </Tip>
          <Tip show={collapsed} label="Expand sidebar">
            <button onClick={toggle} aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="flex w-full items-center gap-3 rounded-xl px-3 py-2 text-ivory-dim transition-colors hover:bg-ivory/[0.04] hover:text-ivory">
              {collapsed ? <PanelLeftOpen size={16} strokeWidth={1.6} className="shrink-0" /> : <PanelLeftClose size={16} strokeWidth={1.6} className="shrink-0" />}
              {!collapsed && <span className="whitespace-nowrap text-[13px]">Collapse</span>}
            </button>
          </Tip>
        </div>
      </motion.aside>
    </>
  );
}

/** Horizontal step switcher shown on phones, where the sidebar is hidden. */
export function MobileSubnav() {
  const pathname = usePathname();
  const current = activeHref(pathname);
  const group = GROUPS.find((g) => g.items.some((i) => i.href === current)) ?? GROUPS[0];
  return (
    <div className="-mx-4 mb-6 overflow-x-auto px-4 scroll-thin md:hidden">
      <ul className="flex gap-2">
        {group.items.map((it) => (
          <li key={it.href}>
            <Link href={it.href}
              className={clsx("block whitespace-nowrap rounded-full px-3.5 py-1.5 text-[13px] ring-1",
                current === it.href ? "bg-champagne/15 text-champagne ring-champagne/30" : "text-ivory-dim ring-ivory/10")}>
              {it.label}
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}

export function AppShell({ children }: { children: ReactNode }) {
  const { sidebarCollapsed, hydrated, authed, verified, role } = useInvestigation();
  const router = useRouter();
  // Session gate: verification, then sign-in, then the workspace.
  useEffect(() => {
    if (!hydrated) return;
    if (!authed) router.replace(verified ? "/signin" : "/verify");
    else if (role === "customer") router.replace("/customer");
    else if (role === null) router.replace("/role");
  }, [hydrated, authed, verified, role, router]);
  const isDesktop = useMedia("(min-width: 1024px)");
  const pathname = usePathname();
  const pad = isDesktop ? (sidebarCollapsed ? COLLAPSED : EXPANDED) : COLLAPSED;
  return (
    <>
      <Sidebar />
      <motion.main
        className="min-h-dvh pt-16 max-md:!pl-0"
        animate={{ paddingLeft: pad }}
        initial={false}
        transition={{ type: "spring", stiffness: 320, damping: 34 }}
      >
        <div className="mx-auto w-full max-w-[1480px] px-4 pb-16 pt-8 sm:px-6 lg:px-10">
          {hydrated && authed && role === "analyst" ? (
            <>
              <MobileSubnav />
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45 }}
          >
            {children}
          </motion.div>
            </>
          ) : (
            <div className="grid min-h-[60vh] place-items-center text-[14px] text-ivory-faint">Checking your session</div>
          )}
        </div>
      </motion.main>
    </>
  );
}
