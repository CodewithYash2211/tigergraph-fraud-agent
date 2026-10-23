"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  Check,
  Fingerprint,
  Globe,
  Key,
  Laptop,
  Lock,
  LogOut,
  MapPin,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import { ChangePasswordModal } from "./CustomerModals";

export function CustomerSecurityTab({
  onSelectTab,
}: {
  onSelectTab: (tab: string) => void;
}) {
  const {
    passwordLastChanged,
    twoFactorEnabled,
    twoFactorMethod,
    biometricEnabled,
    loginAlertsEnabled,
    securitySessions,
    devices,
    changePassword,
    toggleTwoFactor,
    toggleBiometric,
    toggleLoginAlerts,
    signOutSession,
    signOutAllOtherSessions,
  } = useCustomer();

  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [twoFactorModalOpen, setTwoFactorModalOpen] = useState(false);

  const untrustedCount = devices.filter((d) => !d.isTrusted).length;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            SECURITY & AUTHENTICATION
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            Security Centre
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Manage your credentials, multi-factor authentication, passkeys, and active account sessions.
          </p>
        </div>
      </div>

      {/* Security Health Status Card */}
      <div className="sheet flex flex-col gap-5 p-6 sm:flex-row sm:items-center sm:justify-between sm:p-7">
        <div className="flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-sage/15 text-sage">
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display text-[19px] font-semibold text-ivory">Account Protection: Strong</h2>
              <span className="rounded-full bg-sage/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-sage ring-1 ring-sage/30">
                Active Safeguards
              </span>
            </div>
            <p className="mt-1 text-[13.5px] text-ivory-dim leading-relaxed">
              Your account is guarded by 2-step verification, real-time transaction monitoring, and biometric passkeys.
            </p>
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setIsPasswordModalOpen(true)}
            className="btn-primary rounded-xl px-5 py-2.5 text-[13.5px] font-medium"
          >
            Update password
          </button>
        </div>
      </div>

      {/* Security Settings Grid */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Authentication & Password */}
        <section className="sheet p-6 sm:p-7 space-y-6">
          <div className="flex items-center gap-2 border-b hairline pb-4">
            <Key size={18} className="text-champagne" />
            <h3 className="font-display text-[17px]">Login & Password</h3>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="text-[14px] font-medium text-ivory">Account Password</div>
                <div className="text-[12.5px] text-ivory-dim">Last changed: {passwordLastChanged}</div>
              </div>
              <button
                onClick={() => setIsPasswordModalOpen(true)}
                className="btn-quiet rounded-xl px-3.5 py-2 text-[13px]"
              >
                Change
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[14px] font-medium text-ivory">Two-Step Verification (2FA)</span>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10.5px] font-semibold", twoFactorEnabled ? "bg-sage/15 text-sage" : "bg-ivory/10 text-ivory-dim")}>
                    {twoFactorEnabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="text-[12.5px] text-ivory-dim">{twoFactorMethod}</div>
              </div>
              <button
                onClick={() => toggleTwoFactor(!twoFactorEnabled)}
                className={clsx(
                  "rounded-xl px-3.5 py-2 text-[13px] font-medium transition-colors ring-1",
                  twoFactorEnabled
                    ? "bg-white text-crimson ring-line hover:bg-crimson/5"
                    : "btn-primary"
                )}
              >
                {twoFactorEnabled ? "Disable" : "Enable"}
              </button>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="flex items-center gap-2">
                  <Fingerprint size={16} className="text-champagne" />
                  <span className="text-[14px] font-medium text-ivory">Biometric & Passkey</span>
                </div>
                <div className="text-[12.5px] text-ivory-dim">Face ID, Touch ID, or Windows Hello</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={biometricEnabled}
                  onChange={(e) => toggleBiometric(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>

            <div className="flex items-center justify-between rounded-xl bg-slate/40 p-4 border hairline">
              <div>
                <div className="flex items-center gap-2">
                  <Bell size={16} className="text-champagne" />
                  <span className="text-[14px] font-medium text-ivory">Sign-in Security Alerts</span>
                </div>
                <div className="text-[12.5px] text-ivory-dim">Get notified when a new device signs in</div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={loginAlertsEnabled}
                  onChange={(e) => toggleLoginAlerts(e.target.checked)}
                  className="peer sr-only"
                />
                <div className="peer h-6 w-11 rounded-full bg-ivory/20 after:absolute after:left-[2px] after:top-[2px] after:h-5 after:w-5 after:rounded-full after:bg-white after:transition-all after:content-[''] peer-checked:bg-champagne peer-checked:after:translate-x-full peer-focus:outline-none" />
              </label>
            </div>
          </div>
        </section>

        {/* Active Sessions & Connected Devices */}
        <section className="sheet p-6 sm:p-7 space-y-6">
          <div className="flex items-center justify-between border-b hairline pb-4">
            <div className="flex items-center gap-2">
              <Laptop size={18} className="text-champagne" />
              <h3 className="font-display text-[17px]">Active Sessions</h3>
            </div>
            {securitySessions.length > 1 && (
              <button
                onClick={signOutAllOtherSessions}
                className="text-[12.5px] text-crimson hover:underline"
              >
                Sign out other sessions
              </button>
            )}
          </div>

          <div className="space-y-3">
            {securitySessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center justify-between gap-3 rounded-xl border border-line bg-white/80 p-4 shadow-2xs"
              >
                <div className="flex items-center gap-3">
                  <div className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-slate-2 text-ivory">
                    {session.deviceType === "phone" ? (
                      <Smartphone size={17} />
                    ) : session.deviceType === "tablet" ? (
                      <Tablet size={17} />
                    ) : (
                      <Laptop size={17} />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-[13.5px] font-medium text-ivory">{session.deviceName}</span>
                      {session.isCurrent && (
                        <span className="rounded bg-sage/15 px-1.5 py-0.2 text-[10.5px] font-semibold text-sage">
                          Current
                        </span>
                      )}
                    </div>
                    <div className="text-[12px] text-ivory-dim">
                      {session.location} &bull; <span className="font-display">{session.lastActive}</span>
                    </div>
                  </div>
                </div>

                {!session.isCurrent && (
                  <button
                    onClick={() => signOutSession(session.id)}
                    className="rounded-lg p-2 text-ivory-faint hover:bg-crimson/10 hover:text-crimson transition-colors"
                    aria-label={`Sign out ${session.deviceName}`}
                  >
                    <LogOut size={15} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="border-t hairline pt-4 flex items-center justify-between text-[13px]">
            <span className="text-ivory-dim">Want to inspect all trusted devices?</span>
            <button
              onClick={() => onSelectTab("devices")}
              className="text-champagne font-medium hover:underline"
            >
              Go to My Devices &rarr;
            </button>
          </div>
        </section>
      </div>

      {/* Password Modal */}
      <ChangePasswordModal
        isOpen={isPasswordModalOpen}
        onClose={() => setIsPasswordModalOpen(false)}
        onSave={changePassword}
      />
    </div>
  );
}
