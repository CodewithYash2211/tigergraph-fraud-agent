"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Check,
  Edit2,
  Globe,
  Info,
  Laptop,
  LogOut,
  MapPin,
  Monitor,
  Shield,
  ShieldAlert,
  ShieldCheck,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import { RemoveDeviceModal, RenameDeviceModal } from "./CustomerModals";
import type { CustomerDevice } from "@/lib/mock/customer";

export function CustomerDevicesTab() {
  const { devices, removeDevice, toggleDeviceTrust, renameDevice } = useCustomer();
  const [deviceToRemove, setDeviceToRemove] = useState<CustomerDevice | null>(null);
  const [deviceToRename, setDeviceToRename] = useState<CustomerDevice | null>(null);

  const getDeviceIcon = (type: CustomerDevice["type"]) => {
    switch (type) {
      case "laptop":
        return Laptop;
      case "phone":
        return Smartphone;
      case "tablet":
        return Tablet;
      default:
        return Monitor;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            DEVICE SECURITY
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            My Devices
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Manage your recognized smartphones, computers, and tablets. Remove unfamiliar devices to revoke access immediately.
          </p>
        </div>
      </div>

      {/* Flagged Unknown Device Banner if present */}
      {devices.some((d) => d.isFlaggedUnknown) && (
        <div className="flex items-start gap-3.5 rounded-2xl border border-champagne/40 bg-champagne/[0.08] p-5 shadow-xs">
          <ShieldAlert size={22} className="mt-0.5 shrink-0 text-champagne" />
          <div className="min-w-0">
            <h3 className="font-display text-[16px] font-semibold text-ivory">
              Unrecognized device detected
            </h3>
            <p className="mt-1 text-[13.5px] leading-relaxed text-ivory-dim">
              An unrecognized Samsung Android phone (SM-G935F) recently signed in from an unknown network. If you do not recognize this device, we strongly recommend removing it and updating your password.
            </p>
          </div>
        </div>
      )}

      {/* Devices Grid */}
      <div className="grid gap-5 md:grid-cols-2">
        {devices.map((device) => {
          const Icon = getDeviceIcon(device.type);
          const isUntrusted = !device.isTrusted;

          return (
            <div
              key={device.id}
              className={clsx(
                "sheet flex flex-col justify-between p-6 transition-all hover:shadow-md",
                isUntrusted && "ring-1 ring-champagne/40"
              )}
            >
              <div>
                {/* Top Row: Device Icon, Name, Badges */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3.5">
                    <div
                      className={clsx(
                        "grid h-12 w-12 shrink-0 place-items-center rounded-2xl ring-1",
                        device.isCurrent
                          ? "bg-champagne/15 text-champagne ring-champagne/30"
                          : isUntrusted
                            ? "bg-crimson/10 text-crimson ring-crimson/25"
                            : "bg-slate-2 text-ivory ring-line"
                      )}
                    >
                      <Icon size={22} strokeWidth={1.8} />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h3 className="font-display text-[17px] font-semibold text-ivory">
                          {device.name}
                        </h3>
                        <button
                          onClick={() => setDeviceToRename(device)}
                          aria-label={`Rename ${device.name}`}
                          className="text-ivory-faint hover:text-champagne transition-colors"
                        >
                          <Edit2 size={13} />
                        </button>
                      </div>
                      <div className="font-display text-[12px] text-ivory-faint">
                        {device.os} &bull; {device.browser}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col items-end gap-1">
                    {device.isCurrent ? (
                      <span className="rounded-full bg-champagne px-2.5 py-0.5 text-[11px] font-semibold text-white shadow-xs">
                        Current device
                      </span>
                    ) : device.isTrusted ? (
                      <span className="inline-flex items-center gap-1 rounded-full bg-sage/15 px-2.5 py-0.5 text-[11px] font-semibold text-sage ring-1 ring-sage/30">
                        <ShieldCheck size={11} />
                        <span>Trusted</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 rounded-full bg-crimson/15 px-2.5 py-0.5 text-[11px] font-semibold text-crimson ring-1 ring-crimson/30">
                        <AlertTriangle size={11} />
                        <span>Unrecognized</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Device Metadata */}
                <dl className="mt-5 space-y-2.5 rounded-xl bg-slate/40 p-4 text-[13px] border hairline">
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-ivory-dim">
                      <MapPin size={13} className="text-ivory-faint" />
                      <span>Approx. Location</span>
                    </dt>
                    <dd className="font-medium text-ivory">{device.location}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="flex items-center gap-1.5 text-ivory-dim">
                      <Globe size={13} className="text-ivory-faint" />
                      <span>IP Address</span>
                    </dt>
                    <dd className="font-display text-ivory-dim">{device.ipAddress}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ivory-dim">Last Active</dt>
                    <dd className="font-medium text-ivory">{device.lastActive}</dd>
                  </div>
                  <div className="flex items-center justify-between">
                    <dt className="text-ivory-dim">First Recognized</dt>
                    <dd className="font-display text-ivory-faint">{device.firstAdded}</dd>
                  </div>
                </dl>
              </div>

              {/* Device Actions */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-2 border-t hairline pt-4">
                <button
                  onClick={() => toggleDeviceTrust(device.id)}
                  className="text-[13px] text-ivory-dim hover:text-ivory hover:underline"
                >
                  {device.isTrusted ? "Revoke trusted status" : "Mark as trusted"}
                </button>

                {!device.isCurrent && (
                  <button
                    onClick={() => setDeviceToRemove(device)}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-crimson/30 bg-crimson/[0.05] px-3.5 py-2 text-[12.5px] font-medium text-crimson hover:bg-crimson/10 transition-colors"
                  >
                    <Trash2 size={13} />
                    <span>Remove & sign out</span>
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Modals */}
      <RemoveDeviceModal
        device={deviceToRemove}
        isOpen={!!deviceToRemove}
        onClose={() => setDeviceToRemove(null)}
        onConfirm={removeDevice}
      />
      <RenameDeviceModal
        device={deviceToRename}
        isOpen={!!deviceToRename}
        onClose={() => setDeviceToRename(null)}
        onSave={renameDevice}
      />
    </div>
  );
}
