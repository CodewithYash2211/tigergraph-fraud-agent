"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import {
  Bell,
  Check,
  ChevronDown,
  LogOut,
  Repeat,
  RotateCcw,
  Shield,
  User,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import clsx from "clsx";
import { BrandMark } from "@/components/nav/Navbar";
import { BRAND } from "@/lib/brand";
import { useInvestigation } from "@/lib/state/investigation";
import { useCustomer } from "@/lib/state/customer";

export function CustomerHeader({
  activeTab,
  onSelectTab,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}) {
  const router = useRouter();
  const { signOut } = useInvestigation();
  const { profile, notifications, resetCustomerState } = useCustomer();
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b hairline bg-graphite/90 backdrop-blur-xl transition-all">
      <div className="mx-auto flex h-16 w-full max-w-[1480px] items-center justify-between px-4 sm:px-6 lg:px-10">
        {/* Brand & Workspace Title */}
        <div className="flex items-center gap-3">
          <Link href="/" className="flex items-center gap-2.5 transition-opacity hover:opacity-85">
            <BrandMark size={24} />
            <span className="font-display text-[16px] font-semibold tracking-[-0.02em] text-ivory">
              {BRAND.name}
            </span>
          </Link>
          <div className="hidden h-4 w-px bg-line sm:block" />
          <div className="flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 ring-1 ring-line">
            <span className="h-1.5 w-1.5 rounded-full bg-champagne" />
            <span className="text-[12px] font-medium text-ivory">Customer Portal · Demo</span>
          </div>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Notifications Shortcut */}
          <button
            onClick={() => onSelectTab("notifications")}
            aria-label={`Notifications (${unreadNotifsCount} unread)`}
            className={clsx(
              "relative flex h-9 w-9 items-center justify-center rounded-full transition-colors",
              activeTab === "notifications"
                ? "bg-champagne/15 text-champagne ring-1 ring-champagne/30"
                : "btn-quiet"
            )}
          >
            <Bell size={16} />
            {unreadNotifsCount > 0 && (
              <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-champagne px-1 text-[10px] font-bold text-white shadow-sm">
                {unreadNotifsCount}
              </span>
            )}
          </button>

          {/* Switch to Analyst Role */}
          <Link
            href="/role"
            className="hidden items-center gap-1.5 rounded-xl btn-quiet px-3 py-2 text-[13px] text-ivory-dim transition-all hover:text-ivory sm:inline-flex"
          >
            <Repeat size={14} className="text-champagne" />
            <span>Switch role</span>
          </Link>

          {/* Customer User Chip & Dropdown */}
          <div ref={menuRef} className="relative">
            <button
              onClick={() => setUserMenuOpen((prev) => !prev)}
              aria-expanded={userMenuOpen}
              className="flex items-center gap-2.5 rounded-full bg-white/70 py-1 pl-1 pr-3 ring-1 ring-line transition-all hover:bg-white hover:ring-champagne/40"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-gradient-to-br from-champagne to-champagne-deep text-[12px] font-semibold text-white shadow-xs">
                {profile.firstName[0]}
                {profile.lastName[0]}
              </span>
              <span className="hidden text-left sm:block">
                <span className="block text-[13px] font-medium leading-none text-ivory">
                  {profile.fullName}
                </span>
                <span className="block font-display text-[11px] text-ivory-faint leading-tight">
                  {profile.id}
                </span>
              </span>
              <ChevronDown
                size={14}
                className={clsx(
                  "text-ivory-faint transition-transform duration-200",
                  userMenuOpen && "rotate-180"
                )}
              />
            </button>

            <AnimatePresence>
              {userMenuOpen && (
                <motion.div
                  initial={{ opacity: 0, y: -6, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: -6, scale: 0.98 }}
                  transition={{ duration: 0.15 }}
                  className="absolute right-0 mt-2 w-64 overflow-hidden rounded-2xl bg-white p-1 ring-1 ring-line shadow-2xl"
                >
                  <div className="border-b hairline px-4 py-3">
                    <div className="text-[14px] font-medium text-ivory">{profile.fullName}</div>
                    <div className="font-display text-[12px] text-ivory-faint">{profile.id} &bull; {profile.email}</div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11.5px] text-sage">
                      <Shield size={13} />
                      <span>{profile.verificationStatus}</span>
                    </div>
                  </div>

                  <div className="p-1">
                    <button
                      onClick={() => {
                        onSelectTab("account");
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ivory-dim transition-colors hover:bg-slate-2 hover:text-ivory"
                    >
                      <User size={14} /> My Account
                    </button>
                    <button
                      onClick={() => {
                        onSelectTab("security");
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ivory-dim transition-colors hover:bg-slate-2 hover:text-ivory"
                    >
                      <Shield size={14} /> Security Settings
                    </button>
                    <Link
                      href="/role"
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ivory-dim transition-colors hover:bg-slate-2 hover:text-ivory sm:hidden"
                    >
                      <Repeat size={14} /> Switch role
                    </Link>
                  </div>

                  <div className="border-t hairline p-1">
                    <button
                      onClick={() => {
                        resetCustomerState();
                        setUserMenuOpen(false);
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-ivory-dim transition-colors hover:bg-slate-2 hover:text-ivory"
                    >
                      <RotateCcw size={14} /> Reset Demo Data
                    </button>
                    <button
                      onClick={() => {
                        signOut();
                        router.push("/");
                      }}
                      className="flex w-full items-center gap-2.5 rounded-xl px-3 py-2 text-left text-[13px] text-crimson transition-colors hover:bg-crimson/5"
                    >
                      <LogOut size={14} /> Sign out
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </header>
  );
}
