"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Check,
  CreditCard,
  Mail,
  MessageSquare,
  Save,
  Shield,
  SlidersHorizontal,
  Smartphone,
} from "lucide-react";
import { useCustomer } from "@/lib/state/customer";

export function CustomerPreferencesTab() {
  const { preferences, updatePreferences } = useCustomer();

  const [emailAlerts, setEmailAlerts] = useState(preferences.emailAlerts);
  const [smsAlerts, setSmsAlerts] = useState(preferences.smsAlerts);
  const [pushAlerts, setPushAlerts] = useState(preferences.pushAlerts);
  const [alertOnAll, setAlertOnAll] = useState(preferences.alertOnAllTransactions);
  const [threshold, setThreshold] = useState(preferences.transactionAlertThresholdUsd);
  const [securityAlerts, setSecurityAlerts] = useState(preferences.securityAlerts);
  const [investigationUpdates, setInvestigationUpdates] = useState(preferences.investigationUpdates);
  const [monthlyStatements, setMonthlyStatements] = useState(preferences.monthlyStatementsEmail);

  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updatePreferences({
      emailAlerts,
      smsAlerts,
      pushAlerts,
      alertOnAllTransactions: alertOnAll,
      transactionAlertThresholdUsd: Number(threshold),
      securityAlerts,
      investigationUpdates,
      monthlyStatementsEmail: monthlyStatements,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            DELIVERY CHANNELS & RULES
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            Notification Preferences
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Control how and when you receive fraud prevention alerts, purchase confirmations, and security notices.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-6 py-2.5 text-[14px] font-medium self-start sm:self-auto"
        >
          <Save size={15} />
          <span>Save Preferences</span>
        </button>
      </div>

      {/* Save Success Alert */}
      <AnimatePresence>
        {savedSuccess && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="flex items-center gap-3 rounded-2xl border border-sage/30 bg-sage/[0.08] p-4 text-[14px] text-ivory"
          >
            <div className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-sage text-white">
              <Check size={14} strokeWidth={3} />
            </div>
            <span>Preferences saved successfully.</span>
          </motion.div>
        )}
      </AnimatePresence>

      <form onSubmit={handleSave} className="grid gap-6 md:grid-cols-2">
        {/* Delivery Channels */}
        <section className="sheet p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-2 border-b hairline pb-4">
            <SlidersHorizontal size={18} className="text-champagne" />
            <h2 className="font-display text-[17px]">Communication Channels</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div className="flex items-start gap-3">
                <Mail size={18} className="mt-0.5 text-champagne" />
                <div>
                  <div className="text-[14px] font-medium text-ivory">Email Notifications</div>
                  <div className="text-[12.5px] text-ivory-dim">Receive statements, digests and critical alerts</div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={emailAlerts}
                  onChange={(e) => setEmailAlerts(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div className="flex items-start gap-3">
                <Smartphone size={18} className="mt-0.5 text-champagne" />
                <div>
                  <div className="text-[14px] font-medium text-ivory">SMS Text Messages</div>
                  <div className="text-[12.5px] text-ivory-dim">Real-time fraud verification codes and urgent alerts</div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={smsAlerts}
                  onChange={(e) => setSmsAlerts(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div className="flex items-start gap-3">
                <Bell size={18} className="mt-0.5 text-champagne" />
                <div>
                  <div className="text-[14px] font-medium text-ivory">In-App Push Alerts</div>
                  <div className="text-[12.5px] text-ivory-dim">Instant push notifications for device sign-ins and reviews</div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={pushAlerts}
                  onChange={(e) => setPushAlerts(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>
          </div>
        </section>

        {/* Alert Rules & Triggers */}
        <section className="sheet p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-2 border-b hairline pb-4">
            <Shield size={18} className="text-champagne" />
            <h2 className="font-display text-[17px]">Alert Triggers & Thresholds</h2>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="text-[14px] font-medium text-ivory">Investigation Updates</div>
                <div className="text-[12.5px] text-ivory-dim">Immediate status changes on transactions in review</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={investigationUpdates}
                  onChange={(e) => setInvestigationUpdates(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="text-[14px] font-medium text-ivory">Security & Login Alerts</div>
                <div className="text-[12.5px] text-ivory-dim">Notify on unrecognized devices or password changes</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={securityAlerts}
                  onChange={(e) => setSecurityAlerts(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            <div className="rounded-xl bg-slate/40 p-4 border hairline space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-[14px] font-medium text-ivory">High-Value Purchase Alert Threshold</div>
                  <div className="text-[12.5px] text-ivory-dim">Alert me for purchases above:</div>
                </div>
                <div className="font-display text-[16px] font-semibold text-champagne">
                  ${threshold}
                </div>
              </div>

              <input
                type="range"
                min={25}
                max={1000}
                step={25}
                value={threshold}
                onChange={(e) => setThreshold(Number(e.target.value))}
                className="w-full accent-champagne"
              />
              <div className="flex justify-between text-[11px] font-display text-ivory-faint">
                <span>$25</span>
                <span>$500</span>
                <span>$1,000+</span>
              </div>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="text-[14px] font-medium text-ivory">Monthly e-Statements by Email</div>
                <div className="text-[12.5px] text-ivory-dim">Send PDF statement link at the start of each month</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={monthlyStatements}
                  onChange={(e) => setMonthlyStatements(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>
          </div>
        </section>
      </form>
    </div>
  );
}
