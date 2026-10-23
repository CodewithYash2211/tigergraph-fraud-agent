"use client";

import { motion } from "motion/react";
import {
  Bell,
  CreditCard,
  HelpCircle,
  Laptop,
  LayoutDashboard,
  Receipt,
  ShieldCheck,
  SlidersHorizontal,
  UserRound,
  type LucideIcon,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";

export interface NavTabItem {
  id: string;
  label: string;
  description: string;
  icon: LucideIcon;
  badge?: string | number | null;
  badgeTone?: "champagne" | "neutral" | "sage";
}

export function CustomerSidebarNav({
  activeTab,
  onSelectTab,
}: {
  activeTab: string;
  onSelectTab: (tab: string) => void;
}) {
  const { cards, devices, notifications, supportTickets } = useCustomer();

  const unreadNotifs = notifications.filter((n) => !n.isRead).length;
  const cardsUnderReview = cards.filter((c) => c.hasUnderReviewTxn || c.status === "under_review").length;
  const untrustedDevices = devices.filter((d) => !d.isTrusted).length;
  const openTickets = supportTickets.filter((t) => t.status !== "resolved").length;

  const NAV_ITEMS: NavTabItem[] = [
    {
      id: "overview",
      label: "Overview",
      description: "Account summary & active reviews",
      icon: LayoutDashboard,
      badge: cardsUnderReview > 0 ? "1 Review" : null,
      badgeTone: "champagne",
    },
    {
      id: "account",
      label: "My Account",
      description: "Profile & personal info",
      icon: UserRound,
    },
    {
      id: "cards",
      label: "My Cards",
      description: "Debit, credit & digital cards",
      icon: CreditCard,
      badge: `${cards.length} cards`,
      badgeTone: "neutral",
    },
    {
      id: "devices",
      label: "My Devices",
      description: "Trusted laptops & phones",
      icon: Laptop,
      badge: untrustedDevices > 0 ? "1 alert" : `${devices.length}`,
      badgeTone: untrustedDevices > 0 ? "champagne" : "neutral",
    },
    {
      id: "transactions",
      label: "Transactions",
      description: "Statements & activity history",
      icon: Receipt,
    },
    {
      id: "security",
      label: "Security",
      description: "Password, 2FA & sessions",
      icon: ShieldCheck,
      badge: "2FA Active",
      badgeTone: "sage",
    },
    {
      id: "notifications",
      label: "Notifications",
      description: "Alerts & updates",
      icon: Bell,
      badge: unreadNotifs > 0 ? unreadNotifs : null,
      badgeTone: "champagne",
    },
    {
      id: "preferences",
      label: "Preferences",
      description: "Notification & alert channels",
      icon: SlidersHorizontal,
    },
    {
      id: "support",
      label: "Support",
      description: "Help topics & dispute reporting",
      icon: HelpCircle,
      badge: openTickets > 0 ? `${openTickets} open` : null,
      badgeTone: "neutral",
    },
  ];

  return (
    <aside className="w-full lg:w-64 shrink-0" aria-label="Customer Navigation">
      {/* Desktop Navigation List */}
      <div className="hidden lg:block space-y-1 rounded-2xl border hairline bg-white/75 p-3 shadow-sm backdrop-blur-md">
        <div className="px-3 py-2">
          <span className="eyebrow !text-ivory-faint text-[11px]">WORKSPACE SECTIONS</span>
        </div>

        <nav className="space-y-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={clsx(
                  "group relative flex w-full items-center justify-between gap-3 rounded-xl px-3 py-2.5 text-left transition-all",
                  isActive
                    ? "text-ivory font-medium bg-gradient-to-r from-champagne/[0.16] to-champagne/[0.04] ring-1 ring-champagne/25 shadow-xs"
                    : "text-ivory-dim hover:bg-slate-2 hover:text-ivory"
                )}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    size={17}
                    strokeWidth={1.7}
                    className={clsx(
                      "shrink-0 transition-colors",
                      isActive ? "text-champagne" : "text-ivory-faint group-hover:text-ivory"
                    )}
                  />
                  <span className="truncate text-[13.5px]">{item.label}</span>
                </div>

                {item.badge && (
                  <span
                    className={clsx(
                      "shrink-0 rounded-full px-2 py-0.5 text-[10.5px] font-semibold tracking-tight",
                      item.badgeTone === "champagne"
                        ? "bg-champagne/15 text-champagne ring-1 ring-champagne/30"
                        : item.badgeTone === "sage"
                          ? "bg-sage/15 text-sage ring-1 ring-sage/30"
                          : "bg-ivory/[0.06] text-ivory-dim ring-1 ring-ivory/10"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Mobile/Tablet Horizontal Scrollable Pill Bar */}
      <div className="lg:hidden -mx-4 mb-6 overflow-x-auto px-4 py-1 scroll-thin">
        <div className="flex gap-2 min-w-max pb-1">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => onSelectTab(item.id)}
                className={clsx(
                  "flex items-center gap-2 rounded-full px-3.5 py-2 text-[13px] font-medium transition-all ring-1",
                  isActive
                    ? "bg-champagne text-white ring-champagne shadow-sm"
                    : "bg-white/80 text-ivory-dim ring-line hover:bg-white hover:text-ivory"
                )}
              >
                <Icon size={15} />
                <span>{item.label}</span>
                {item.badge && (
                  <span
                    className={clsx(
                      "rounded-full px-1.5 py-0.2 text-[10px] font-bold",
                      isActive
                        ? "bg-white/20 text-white"
                        : "bg-champagne/15 text-champagne"
                    )}
                  >
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    </aside>
  );
}
