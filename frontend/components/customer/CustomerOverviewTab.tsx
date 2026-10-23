"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  Activity,
  AlertCircle,
  ArrowRight,
  ArrowUpRight,
  Check,
  CreditCard,
  History,
  Laptop,
  Lock,
  Receipt,
  RotateCcw,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Sparkles,
  UserCheck,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import { useInvestigation } from "@/lib/state/investigation";
import type { CustomerTransaction } from "@/lib/mock/customer";

export function CustomerOverviewTab({
  onSelectTab,
  onOpenTxnDetail,
  onOpenReportModal,
}: {
  onSelectTab: (tab: string) => void;
  onOpenTxnDetail: (txn: CustomerTransaction) => void;
  onOpenReportModal: (txn?: CustomerTransaction) => void;
}) {
  const { profile, cards, devices, transactions, activityLog } = useCustomer();
  const { decision, customerReply, setCustomerReply } = useInvestigation();

  const flaggedTxn = transactions.find((t) => t.isFlaggedUnderReview) || transactions[0];
  const resolved = decision !== "pending";
  const approvedLocally = decision === "approved";
  const steps = ["Flagged for review", "Under review", "Local demo response", resolved ? "Local choice" : "Decision"];
  const currentStepIndex = resolved ? 3 : customerReply ? 3 : 2;

  const activeCardsCount = cards.filter((c) => c.status === "active").length;
  const trustedDevicesCount = devices.filter((d) => d.isTrusted).length;
  const openReviewsCount = resolved ? 0 : 1;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Banner */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2 text-[13px] text-ivory-faint">
            <span>Customer ID: <strong className="font-display font-medium text-ivory">{profile.id}</strong></span>
            <span>&bull;</span>
            <span className="inline-flex items-center gap-1 text-sage">
              <Check size={13} /> {profile.verificationStatus}
            </span>
          </div>
          <h1 className="mt-1.5 font-display text-[clamp(26px,3vw,36px)] leading-tight text-ivory">
            Welcome back, {profile.firstName}
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Manage your accounts, active cards, security settings and review recent transaction alerts.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={() => onOpenReportModal()}
            className="btn-quiet inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px]"
          >
            <ShieldAlert size={15} className="text-champagne" />
            <span>Report suspicious charge</span>
          </button>
        </div>
      </div>

      {/* 4 Top Metric Cards */}
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div className="sheet p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between text-ivory-faint">
            <span className="text-[12.5px] font-medium">Active Cards</span>
            <CreditCard size={16} className="text-champagne" />
          </div>
          <div className="mt-3 font-display text-[26px] font-semibold text-ivory">
            {activeCardsCount}
            <span className="text-[13px] font-normal text-ivory-faint"> / {cards.length} total</span>
          </div>
          <div className="mt-1 text-[12px] text-ivory-dim">Protected under Zero Liability</div>
        </div>

        <div className="sheet p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between text-ivory-faint">
            <span className="text-[12.5px] font-medium">Trusted Devices</span>
            <Laptop size={16} className="text-champagne" />
          </div>
          <div className="mt-3 font-display text-[26px] font-semibold text-ivory">
            {trustedDevicesCount}
            <span className="text-[13px] font-normal text-ivory-faint"> / {devices.length} known</span>
          </div>
          <div className="mt-1 text-[12px] text-ivory-dim">
            {devices.some((d) => !d.isTrusted) ? (
              <span className="text-champagne font-medium">1 unrecognized device</span>
            ) : (
              "All devices verified"
            )}
          </div>
        </div>

        <div className="sheet p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between text-ivory-faint">
            <span className="text-[12.5px] font-medium">Security Status</span>
            <ShieldCheck size={16} className="text-sage" />
          </div>
          <div className="mt-3 font-display text-[26px] font-semibold text-sage">
            Secure
          </div>
          <div className="mt-1 text-[12px] text-ivory-dim">Two-step verification active</div>
        </div>

        <div className="sheet p-5 transition-shadow hover:shadow-md">
          <div className="flex items-center justify-between text-ivory-faint">
            <span className="text-[12.5px] font-medium">Open Reviews</span>
            <AlertCircle size={16} className={openReviewsCount > 0 ? "text-champagne" : "text-sage"} />
          </div>
          <div className={clsx("mt-3 font-display text-[26px] font-semibold", openReviewsCount > 0 ? "text-champagne" : "text-ivory")}>
            {openReviewsCount}
          </div>
          <div className="mt-1 text-[12px] text-ivory-dim">
            {openReviewsCount > 0 ? "Action requested below" : "No pending reviews"}
          </div>
        </div>
      </div>

      {/* Main Grid: Current Investigation & Recent Activity */}
      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column */}
        <div className="space-y-6">
          {/* CURRENT INVESTIGATION CARD */}
          <section className={clsx("sheet overflow-hidden p-6 sm:p-7 transition-all", !resolved && "ring-1 ring-champagne/40 shadow-lg")}>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b hairline pb-4">
              <div className="flex items-center gap-2">
                <span className={clsx("h-2.5 w-2.5 rounded-full", resolved ? "bg-sage" : "bg-champagne animate-pulse")} />
                <span className={clsx("font-display text-[15px] font-semibold", resolved ? "text-sage" : "text-champagne")}>
                  {resolved ? "Review Complete" : "Transaction Security Review"}
                </span>
              </div>
              <span className="rounded-full bg-slate-2 px-3 py-1 font-display text-[12px] text-ivory-dim">
                Status: {resolved ? `Local ${decision} choice` : "Sample review"}
              </span>
            </div>

            {/* Flagged Transaction Brief */}
            <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate to-slate-2 p-5 ring-1 ring-line">
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="font-display text-[13px] text-ivory-faint">ONLINE ORDER #{flaggedTxn?.id}</span>
                  <div className="mt-0.5 text-[18px] font-semibold text-ivory">{flaggedTxn?.merchant}</div>
                </div>
                <div className="text-right">
                  <div className="font-display text-[26px] font-semibold text-ivory">${flaggedTxn?.amountUsd.toFixed(2)}</div>
                  <div className="text-[12px] text-ivory-faint">Debit Card •4417</div>
                </div>
              </div>
              <div className="mt-3 flex items-center justify-between border-t border-line/60 pt-3 text-[12.5px] text-ivory-dim">
                <span>Date: {flaggedTxn?.date} at {flaggedTxn?.time}</span>
                <span className="rounded bg-white/70 px-2 py-0.5 ring-1 ring-line">{flaggedTxn?.channel === "online" ? "Online Channel" : "Point of Sale"}</span>
              </div>
            </div>

            {/* 4-Step Progress Tracker */}
            <div className="mt-6">
              <div className="mb-2 text-[12.5px] font-medium text-ivory-faint">Investigation Progress</div>
              <ol className="grid grid-cols-4 gap-2" aria-label="Review timeline">
                {steps.map((s, idx) => (
                  <li key={s}>
                    <div className="h-1.5 overflow-hidden rounded-full bg-ivory/10">
                      <motion.div
                        className="h-full bg-champagne"
                        initial={{ width: 0 }}
                        animate={{ width: idx <= currentStepIndex ? "100%" : "0%" }}
                        transition={{ duration: 0.4, delay: idx * 0.08 }}
                      />
                    </div>
                    <div className={clsx("mt-2 text-[11px] sm:text-[12px] leading-tight", idx === currentStepIndex ? "font-medium text-champagne" : idx < currentStepIndex ? "text-ivory" : "text-ivory-faint")}>
                      {s}
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            {/* Interactive Verification Form / Safe Outcome */}
            <div className="mt-6 border-t hairline pt-5">
              <AnimatePresence mode="wait">
                {!customerReply && !resolved ? (
                  <motion.div
                    key="ask"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="rounded-2xl border border-champagne/30 bg-champagne/[0.06] p-5"
                  >
                    <div className="flex items-start gap-3">
                      <ShieldAlert size={20} className="mt-0.5 shrink-0 text-champagne" />
                      <div className="min-w-0">
                        <div className="font-display text-[16px] font-medium text-ivory">Did you authorize this transaction?</div>
                        <p className="mt-1 text-[13.5px] text-ivory-dim leading-relaxed">
                          We noticed this transaction was made from a new device. Please confirm whether you made this purchase. Your card stays active while we verify.
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2.5">
                          <button
                            onClick={() => setCustomerReply("confirmed")}
                            className="btn-quiet rounded-xl px-4 py-2 text-[13.5px] font-medium"
                          >
                            Yes, I authorized it
                          </button>
                          <button
                            onClick={() => setCustomerReply("denied")}
                            className="btn-primary rounded-xl px-4 py-2 text-[13.5px] font-medium"
                          >
                            No, I did not make this
                          </button>
                        </div>
                        <div className="mt-3 text-[11.5px] text-ivory-faint">
                          Local demo input only: no message is sent and no backend investigation is updated.
                        </div>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div
                    key="feedback"
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="flex items-start gap-3.5 rounded-2xl border border-line bg-white/80 p-5 shadow-xs"
                  >
                    <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-sage/15 text-sage">
                      <ShieldCheck size={18} />
                    </div>
                    <div className="text-[13.5px] leading-relaxed">
                      {resolved ? (
                        approvedLocally ? (
                          <div>
                            <span className="font-semibold text-ivory">Analyst choice marked approved in this browser session.</span>
                            <p className="mt-0.5 text-ivory-dim">
                              No card lock, replacement card, dispute decision, or account change was sent to a backend.
                            </p>
                          </div>
                        ) : (
                          <div>
                            <span className="font-semibold text-ivory">A local analyst choice was recorded.</span>
                            <p className="mt-0.5 text-ivory-dim">This does not change your account or create a backend case update.</p>
                          </div>
                        )
                      ) : customerReply === "denied" ? (
                        <div>
                          <span className="font-semibold text-ivory">Thank you for letting us know.</span>
                          <p className="mt-0.5 text-ivory-dim">
                            Your sample response is stored in this browser session only. It was not sent to a fraud investigation service.
                          </p>
                        </div>
                      ) : (
                        <div>
                          <span className="font-semibold text-ivory">Confirmation received.</span>
                          <p className="mt-0.5 text-ivory-dim">
                            Your sample response is stored in this browser session only. No transaction or account status was changed.
                          </p>
                        </div>
                      )}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* RECENT TRANSACTIONS TABLE */}
          <section className="sheet p-6 sm:p-7">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-display text-[18px]">Recent transactions</h2>
                <p className="text-[12.5px] text-ivory-dim">Your latest debit and credit card activity</p>
              </div>
              <button
                onClick={() => onSelectTab("transactions")}
                className="inline-flex items-center gap-1 text-[13px] font-medium text-champagne hover:underline"
              >
                <span>View all</span>
                <ArrowRight size={14} />
              </button>
            </div>

            <div className="mt-4 divide-y divide-line overflow-hidden rounded-xl border border-line bg-white/70">
              {transactions.slice(0, 5).map((t) => (
                <div
                  key={t.id}
                  onClick={() => onOpenTxnDetail(t)}
                  className="flex cursor-pointer items-center justify-between gap-3 p-3.5 transition-colors hover:bg-slate/50"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-2 text-ivory-dim">
                      <Receipt size={16} />
                    </div>
                    <div className="min-w-0">
                      <div className="truncate text-[14px] font-medium text-ivory">{t.merchant}</div>
                      <div className="text-[12px] text-ivory-faint">
                        •{t.cardLast4} &bull; {t.date}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div className="font-display text-[14.5px] font-medium text-ivory">
                      ${t.amountUsd.toFixed(2)}
                    </div>
                    <span
                      className={clsx(
                        "inline-block rounded-full px-2 py-0.5 text-[11px] font-medium",
                        t.status === "under_review"
                          ? "bg-champagne/15 text-champagne"
                          : t.status === "completed"
                            ? "bg-sage/15 text-sage"
                            : "bg-ivory/10 text-ivory-dim"
                      )}
                    >
                      {t.status === "under_review" ? "Under Review" : "Completed"}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </section>
        </div>

        {/* Right Column: Cards Brief & Activity Feed */}
        <div className="space-y-6">
          {/* CARDS OVERVIEW */}
          <section className="sheet p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CreditCard size={17} className="text-champagne" />
                <h3 className="font-display text-[16px]">My Cards</h3>
              </div>
              <button
                onClick={() => onSelectTab("cards")}
                className="text-[12.5px] text-champagne hover:underline"
              >
                Manage
              </button>
            </div>

            <div className="mt-4 space-y-3">
              {cards.map((c) => (
                <div
                  key={c.id}
                  className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/80 p-3.5 shadow-2xs"
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={clsx(
                        "grid h-8 w-11 place-items-center rounded-md text-[10px] font-bold text-white shadow-xs",
                        c.colorScheme === "coral"
                          ? "bg-gradient-to-br from-champagne to-champagne-deep"
                          : c.colorScheme === "sapphire"
                            ? "bg-gradient-to-br from-ivory to-ivory-dim"
                            : "bg-gradient-to-br from-cyan to-gold"
                      )}
                    >
                      {c.brand}
                    </div>
                    <div>
                      <div className="text-[13.5px] font-medium text-ivory">{c.nickname}</div>
                      <div className="font-display text-[11.5px] text-ivory-faint">•••• {c.last4} &bull; Exp {c.expiryMonth}/{c.expiryYear}</div>
                    </div>
                  </div>

                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                      c.status === "locked"
                        ? "bg-crimson/15 text-crimson ring-1 ring-crimson/30"
                        : c.hasUnderReviewTxn
                          ? "bg-champagne/15 text-champagne ring-1 ring-champagne/30"
                          : "bg-sage/15 text-sage ring-1 ring-sage/30"
                    )}
                  >
                    {c.status === "locked" ? "Locked" : c.hasUnderReviewTxn ? "Review" : "Active"}
                  </span>
                </div>
              ))}
            </div>
          </section>

          {/* QUICK ACTIONS */}
          <section className="sheet p-6">
            <div className="flex items-center gap-2 text-ivory">
              <Sparkles size={16} className="text-champagne" />
              <h3 className="font-display text-[16px]">Quick Actions</h3>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2.5">
              <button
                onClick={() => onSelectTab("cards")}
                className="flex flex-col items-start gap-1 rounded-xl border border-line bg-white/80 p-3 text-left transition-all hover:bg-slate-2"
              >
                <Lock size={15} className="text-champagne" />
                <span className="text-[13px] font-medium text-ivory">Lock / Unlock Card</span>
                <span className="text-[11px] text-ivory-faint">Instant freeze toggle</span>
              </button>

              <button
                onClick={() => onSelectTab("devices")}
                className="flex flex-col items-start gap-1 rounded-xl border border-line bg-white/80 p-3 text-left transition-all hover:bg-slate-2"
              >
                <Laptop size={15} className="text-champagne" />
                <span className="text-[13px] font-medium text-ivory">Review Devices</span>
                <span className="text-[11px] text-ivory-faint">{devices.length} known devices</span>
              </button>

              <button
                onClick={() => onSelectTab("security")}
                className="flex flex-col items-start gap-1 rounded-xl border border-line bg-white/80 p-3 text-left transition-all hover:bg-slate-2"
              >
                <ShieldCheck size={15} className="text-champagne" />
                <span className="text-[13px] font-medium text-ivory">Security & 2FA</span>
                <span className="text-[11px] text-ivory-faint">Password & passkeys</span>
              </button>

              <button
                onClick={() => onOpenReportModal()}
                className="flex flex-col items-start gap-1 rounded-xl border border-line bg-white/80 p-3 text-left transition-all hover:bg-slate-2"
              >
                <ShieldAlert size={15} className="text-champagne" />
                <span className="text-[13px] font-medium text-ivory">Report Charge</span>
                <span className="text-[11px] text-ivory-faint">Dispute unfamiliar charge</span>
              </button>
            </div>
          </section>

          {/* RECENT ACCOUNT ACTIVITY FEED */}
          <section className="sheet p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <History size={16} className="text-ivory-faint" />
                <h3 className="font-display text-[16px]">Account Activity</h3>
              </div>
              <span className="text-[12px] text-ivory-faint">Latest events</span>
            </div>

            <ul className="mt-4 space-y-3">
              {activityLog.slice(0, 5).map((item) => (
                <li key={item.id} className="flex items-start gap-3 text-[13px]">
                  <span className="mt-1 h-2 w-2 shrink-0 rounded-full bg-champagne" />
                  <div className="min-w-0">
                    <div className="font-medium text-ivory">{item.action}</div>
                    <div className="text-[12px] text-ivory-dim leading-snug">{item.detail}</div>
                    <div className="mt-0.5 font-display text-[11px] text-ivory-faint">{item.timestamp}</div>
                  </div>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
