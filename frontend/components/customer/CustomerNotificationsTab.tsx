"use client";

import { useState } from "react";
import {
  AlertTriangle,
  Bell,
  CheckCheck,
  CreditCard,
  Laptop,
  Receipt,
  ShieldAlert,
  ShieldCheck,
  SlidersHorizontal,
  Trash2,
  User,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import type { CustomerNotification } from "@/lib/mock/customer";

export function CustomerNotificationsTab({
  onSelectTab,
}: {
  onSelectTab: (tab: string) => void;
}) {
  const {
    notifications,
    markNotificationRead,
    markAllNotificationsRead,
    deleteNotification,
  } = useCustomer();

  const [categoryFilter, setCategoryFilter] = useState<string>("all");

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (categoryFilter === "all") return true;
    if (categoryFilter === "unread") return !n.isRead;
    return n.category === categoryFilter;
  });

  const getNotificationIcon = (category: CustomerNotification["category"]) => {
    switch (category) {
      case "investigation":
        return ShieldAlert;
      case "security":
        return AlertTriangle;
      case "transaction":
        return Receipt;
      default:
        return User;
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            COMMUNICATIONS
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            Notifications
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Real-time fraud alerts, transaction notifications, security notices, and review updates.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={markAllNotificationsRead}
              className="btn-quiet inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px]"
            >
              <CheckCheck size={15} />
              <span>Mark all as read</span>
            </button>
          )}

          <button
            onClick={() => onSelectTab("preferences")}
            className="btn-quiet inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px]"
          >
            <SlidersHorizontal size={14} />
            <span>Delivery preferences</span>
          </button>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex flex-wrap gap-2">
        {[
          { id: "all", label: "All" },
          { id: "unread", label: `Unread (${unreadCount})` },
          { id: "investigation", label: "Investigation" },
          { id: "security", label: "Security" },
          { id: "transaction", label: "Transactions" },
          { id: "account", label: "Account" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setCategoryFilter(tab.id)}
            className={clsx(
              "rounded-full px-4 py-2 text-[13px] font-medium transition-all ring-1",
              categoryFilter === tab.id
                ? "bg-champagne text-white ring-champagne shadow-xs"
                : "bg-white/80 text-ivory-dim ring-line hover:bg-white hover:text-ivory"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Notifications List */}
      <div className="sheet divide-y divide-line overflow-hidden">
        {filteredNotifications.length === 0 ? (
          <div className="py-16 text-center text-ivory-dim">
            <Bell size={32} className="mx-auto mb-2 text-ivory-faint" />
            <p className="font-medium text-ivory">No notifications in this category</p>
            <p className="mt-1 text-[13px] text-ivory-faint">You're all caught up!</p>
          </div>
        ) : (
          filteredNotifications.map((notif) => {
            const Icon = getNotificationIcon(notif.category);

            return (
              <div
                key={notif.id}
                className={clsx(
                  "flex items-start justify-between gap-4 p-5 transition-colors",
                  !notif.isRead ? "bg-champagne/[0.04]" : "hover:bg-slate/40"
                )}
              >
                <div className="flex items-start gap-3.5 min-w-0">
                  <div
                    className={clsx(
                      "grid h-10 w-10 shrink-0 place-items-center rounded-2xl ring-1 mt-0.5",
                      notif.category === "investigation"
                        ? "bg-champagne/15 text-champagne ring-champagne/30"
                        : notif.category === "security"
                          ? "bg-crimson/10 text-crimson ring-crimson/25"
                          : "bg-slate-2 text-ivory-dim ring-line"
                    )}
                  >
                    <Icon size={18} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h3 className="font-medium text-[14.5px] text-ivory">
                        {notif.title}
                      </h3>
                      {!notif.isRead && (
                        <span className="h-2 w-2 rounded-full bg-champagne" />
                      )}
                      <span className="rounded bg-slate-2 px-2 py-0.5 font-display text-[10.5px] uppercase tracking-wide text-ivory-faint">
                        {notif.category}
                      </span>
                    </div>

                    <p className="mt-1 text-[13.5px] leading-relaxed text-ivory-dim">
                      {notif.message}
                    </p>

                    <div className="mt-3 flex items-center gap-3">
                      <span className="font-display text-[11.5px] text-ivory-faint">
                        {notif.timestamp}
                      </span>

                      {notif.actionLabel && notif.actionTab && (
                        <button
                          onClick={() => {
                            markNotificationRead(notif.id);
                            onSelectTab(notif.actionTab!);
                          }}
                          className="text-[12.5px] font-medium text-champagne hover:underline"
                        >
                          {notif.actionLabel} &rarr;
                        </button>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex shrink-0 items-center gap-2">
                  {!notif.isRead && (
                    <button
                      onClick={() => markNotificationRead(notif.id)}
                      title="Mark as read"
                      className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2 hover:text-ivory"
                    >
                      <CheckCheck size={16} />
                    </button>
                  )}
                  <button
                    onClick={() => deleteNotification(notif.id)}
                    title="Delete notification"
                    className="rounded-lg p-1.5 text-ivory-faint hover:bg-crimson/10 hover:text-crimson"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
