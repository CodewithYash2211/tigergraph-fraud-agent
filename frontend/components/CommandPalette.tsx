"use client";

import { AnimatePresence, motion } from "motion/react";
import { ArrowUpRight, CreditCard, FileText, FolderLock, MapPin, Receipt, Search, Smartphone, Building2, UserRound, type LucideIcon } from "lucide-react";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { getCasePack, getClosedCases } from "@/lib/data/adapter";
import { TRIGGER_LABEL } from "@/lib/data/labels";
import { useInvestigation } from "@/lib/state/investigation";
import { getGraphForCase } from "@/lib/data/investigation-data";

interface Hit { group: string; label: string; sub: string; href: string; icon: LucideIcon; hay: string }

const ICON: Record<string, LucideIcon> = {
  customer: UserRound, account: CreditCard, device: Smartphone, merchant: Building2, location: MapPin, case: FolderLock, transaction: Receipt,
};

const INDEX: Hit[] = [
  ...getCasePack().map((c) => ({ group: "Cases", label: c.case_id, sub: `${TRIGGER_LABEL[c.trigger_type]}, card ${c.card_id}`, href: `/cases/${c.case_id}/`, icon: FolderLock, hay: `${c.case_id} ${c.card_id} ${c.customer_id} ${c.trigger_text} case` })),
  ...getCasePack().map((c) => ({ group: "Transactions", label: `TXN ${c.flagged_txn_id}`, sub: `flagged in ${c.case_id}`, href: `/transactions/${c.flagged_txn_id}/`, icon: Receipt, hay: `${c.flagged_txn_id} transaction ${c.card_id}` })),
  ...getClosedCases().map((m) => ({ group: "Case memory", label: m.case_id, sub: `${m.outcome === "confirmed_fraud" ? "confirmed fraud" : "cleared"}, ${m.pattern}, ${m.card_id}`, href: "/cases/memory/", icon: FolderLock, hay: `${m.case_id} ${m.card_id} ${m.customer_id} ${m.pattern} closed case memory` })),
];

const SUGGESTED = (() => {
  const c0 = getCasePack()[0];
  const cc0 = getClosedCases()[0];
  return [c0?.case_id, c0 ? `TXN ${c0.flagged_txn_id}` : null, cc0?.case_id].filter((x): x is string => !!x);
})();

export function openSearch() {
  window.dispatchEvent(new Event("tg:search"));
}

export function CommandPalette() {
  const router = useRouter();
  const { caseId, answer } = useInvestigation();
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const [idx, setIdx] = useState(0);
  const input = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") { e.preventDefault(); setOpen((o) => !o); }
      if (e.key === "Escape") setOpen(false);
    };
    const onOpen = () => setOpen(true);
    window.addEventListener("keydown", onKey);
    window.addEventListener("tg:search", onOpen);
    return () => { window.removeEventListener("keydown", onKey); window.removeEventListener("tg:search", onOpen); };
  }, []);
  useEffect(() => { if (open) { setQ(""); setIdx(0); setTimeout(() => input.current?.focus(), 30); } }, [open]);

  const hits = useMemo(() => {
    const rawAnswer = answer?.answer.live ? answer.answer : null;
    const entityHits: Hit[] = getGraphForCase(caseId, rawAnswer).entities
      .filter((e) => e.kind === "device" || e.kind === "customer")
      .map((e) => ({
        group: "Entities", label: e.label, sub: `${e.kind}, ${e.sub}`, href: `/intelligence/#${e.id}`, icon: ICON[e.kind] ?? FileText, hay: `${e.label} ${e.sub} ${e.kind} device`,
      }));
    const index = [...INDEX, ...entityHits];
    const t = q.trim().toLowerCase();
    const list = t ? index.filter((h) => t.split(/\s+/).every((w) => h.hay.toLowerCase().includes(w))) : index.filter((h) => SUGGESTED.includes(h.label));
    return list.slice(0, 9);
  }, [q, caseId, answer]);
  useEffect(() => setIdx(0), [q]);

  const go = (h: Hit) => { setOpen(false); router.push(h.href); };

  let lastGroup = "";
  return (
    <AnimatePresence>
      {open && (
        <motion.div className="fixed inset-0 z-[90] flex items-start justify-center bg-graphite/60 px-4 pt-[14vh] backdrop-blur-sm"
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setOpen(false)}>
          <motion.div role="dialog" aria-label="Search the investigation"
            initial={{ opacity: 0, y: -10, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 34 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[600px] overflow-hidden rounded-2xl bg-[#FFFFFF] ring-1 ring-ivory/15 shadow-[0_40px_100px_-20px_rgba(30,30,45,0.21)]">
            <div className="flex items-center gap-3 border-b hairline px-5 py-4">
              <Search size={18} className="text-champagne" />
              <input ref={input} value={q} onChange={(e) => setQ(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") { e.preventDefault(); setIdx((i) => Math.min(i + 1, hits.length - 1)); }
                  if (e.key === "ArrowUp") { e.preventDefault(); setIdx((i) => Math.max(i - 1, 0)); }
                  if (e.key === "Enter" && hits[idx]) go(hits[idx]);
                }}
                placeholder="Search cases, transactions, cards, customers, devices"
                className="w-full bg-transparent text-[16px] placeholder:text-ivory-faint focus:outline-none" aria-label="Search" />
              <span className="rounded-md px-1.5 py-0.5 text-[11px] text-ivory-faint ring-1 ring-ivory/15">esc</span>
            </div>
            <div className="max-h-[52vh] overflow-y-auto py-2 scroll-thin">
              {hits.length === 0 ? (
                <div className="px-5 py-10 text-center text-[14px] text-ivory-dim">
                  Nothing matches &ldquo;{q}&rdquo;. Try a case ID, a card ID, a closed case, or a device model.
                </div>
              ) : hits.map((h, i) => {
                const head = q ? h.group !== lastGroup && (lastGroup = h.group) : i === 0;
                const Icon = h.icon;
                return (
                  <div key={h.group + h.label}>
                    {head && <div className="px-5 pb-1 pt-3 text-[11.5px] text-ivory-faint">{q ? h.group : "Suggested"}</div>}
                    <button onMouseEnter={() => setIdx(i)} onClick={() => go(h)}
                      className={clsx("flex w-full items-center gap-3 px-5 py-2.5 text-left transition-colors", i === idx && "bg-ivory/[0.06]")}>
                      <span className={clsx("grid h-8 w-8 place-items-center rounded-lg ring-1", i === idx ? "text-champagne ring-champagne/30" : "text-ivory-dim ring-ivory/10")}><Icon size={15} /></span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[14px] tnum">{h.label}</span>
                        <span className="block truncate text-[12px] text-ivory-faint">{h.sub}</span>
                      </span>
                      {i === idx && <ArrowUpRight size={15} className="text-ivory-faint" />}
                    </button>
                  </div>
                );
              })}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
