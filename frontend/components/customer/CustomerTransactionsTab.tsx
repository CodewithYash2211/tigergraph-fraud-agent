"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  ArrowUpDown,
  CreditCard,
  Download,
  Filter,
  Flag,
  Globe,
  Receipt,
  Search,
  SlidersHorizontal,
  Store,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import type { CustomerTransaction } from "@/lib/mock/customer";

export function CustomerTransactionsTab({
  selectedCardFilter,
  onOpenTxnDetail,
  onOpenReportModal,
}: {
  selectedCardFilter?: string | null;
  onOpenTxnDetail: (txn: CustomerTransaction) => void;
  onOpenReportModal: (txn?: CustomerTransaction) => void;
}) {
  const { transactions, cards } = useCustomer();

  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [cardFilter, setCardFilter] = useState<string>(selectedCardFilter || "all");
  const [channelFilter, setChannelFilter] = useState<string>("all");

  const filteredTransactions = useMemo(() => {
    return transactions.filter((t) => {
      // Search match
      const q = searchQuery.toLowerCase().trim();
      const matchesSearch =
        !q ||
        t.merchant.toLowerCase().includes(q) ||
        t.id.toLowerCase().includes(q) ||
        t.description.toLowerCase().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.amountUsd.toString().includes(q);

      // Status match
      const matchesStatus =
        statusFilter === "all" || t.status === statusFilter;

      // Card match
      const matchesCard =
        cardFilter === "all" || t.cardId === cardFilter;

      // Channel match
      const matchesChannel =
        channelFilter === "all" || t.channel === channelFilter;

      return matchesSearch && matchesStatus && matchesCard && matchesChannel;
    });
  }, [transactions, searchQuery, statusFilter, cardFilter, channelFilter]);

  const totalFilteredSum = useMemo(() => {
    return filteredTransactions.reduce((sum, t) => sum + t.amountUsd, 0);
  }, [filteredTransactions]);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            TRANSACTION LEDGER
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            Transactions
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Search and review statements across your cards. Click any charge to inspect details or report unfamiliar activity.
          </p>
        </div>

        <button
          onClick={() => onOpenReportModal()}
          className="btn-quiet inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-[13.5px] self-start sm:self-auto"
        >
          <Flag size={14} className="text-crimson" />
          <span>Report an issue</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="sheet p-4 sm:p-5 space-y-4">
        <div className="grid gap-3 sm:grid-cols-[1.5fr_1fr_1fr_1fr]">
          {/* Search Input */}
          <div className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-ivory-faint" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search merchant, amount, or ID..."
              className="w-full rounded-xl bg-slate/60 py-2.5 pl-10 pr-4 text-[13.5px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            />
          </div>

          {/* Status Filter */}
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl bg-slate/60 px-3 py-2.5 text-[13.5px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
          >
            <option value="all">All statuses</option>
            <option value="under_review">Under Review</option>
            <option value="completed">Completed</option>
            <option value="pending">Pending</option>
          </select>

          {/* Card Filter */}
          <select
            value={cardFilter}
            onChange={(e) => setCardFilter(e.target.value)}
            className="rounded-xl bg-slate/60 px-3 py-2.5 text-[13.5px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
          >
            <option value="all">All cards</option>
            {cards.map((c) => (
              <option key={c.id} value={c.id}>
                {c.nickname} (•{c.last4})
              </option>
            ))}
          </select>

          {/* Channel Filter */}
          <select
            value={channelFilter}
            onChange={(e) => setChannelFilter(e.target.value)}
            className="rounded-xl bg-slate/60 px-3 py-2.5 text-[13.5px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
          >
            <option value="all">All channels</option>
            <option value="online">Online only</option>
            <option value="in_person">In-person only</option>
          </select>
        </div>

        {/* Results summary bar */}
        <div className="flex items-center justify-between border-t hairline pt-3 text-[12.5px] text-ivory-dim">
          <span>
            Showing <strong>{filteredTransactions.length}</strong> transaction{filteredTransactions.length === 1 ? "" : "s"}
          </span>
          <span className="font-display">
            Filtered Total: <strong>${totalFilteredSum.toFixed(2)}</strong>
          </span>
        </div>
      </div>

      {/* Transactions List */}
      <div className="sheet overflow-hidden">
        {filteredTransactions.length === 0 ? (
          <div className="py-16 text-center text-ivory-dim">
            <Receipt size={32} className="mx-auto mb-2 text-ivory-faint" />
            <p className="font-medium text-ivory">No matching transactions found</p>
            <p className="mt-1 text-[13px] text-ivory-faint">Try adjusting your search or clearing active filters.</p>
          </div>
        ) : (
          <div className="divide-y divide-line overflow-x-auto">
            <table className="w-full text-left text-[13.5px]">
              <thead className="border-b hairline bg-slate/50 font-display text-[11.5px] text-ivory-faint uppercase">
                <tr>
                  <th className="py-3 pl-6 pr-4">Transaction / Merchant</th>
                  <th className="px-4 py-3">Card</th>
                  <th className="px-4 py-3">Channel</th>
                  <th className="px-4 py-3">Date & Time</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="py-3 pl-4 pr-6 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line bg-white/70">
                {filteredTransactions.map((t) => (
                  <tr
                    key={t.id}
                    onClick={() => onOpenTxnDetail(t)}
                    className="cursor-pointer transition-colors hover:bg-slate-2"
                  >
                    <td className="py-4 pl-6 pr-4">
                      <div className="flex items-center gap-3">
                        <div
                          className={clsx(
                            "grid h-9 w-9 shrink-0 place-items-center rounded-xl",
                            t.status === "under_review"
                              ? "bg-champagne/15 text-champagne"
                              : "bg-slate-2 text-ivory-dim"
                          )}
                        >
                          {t.channel === "online" ? <Globe size={16} /> : <Store size={16} />}
                        </div>
                        <div>
                          <div className="font-medium text-ivory">{t.merchant}</div>
                          <div className="font-display text-[11.5px] text-ivory-faint">
                            #{t.id} &bull; {t.category}
                          </div>
                        </div>
                      </div>
                    </td>

                    <td className="px-4 py-4 text-ivory-dim">
                      <span className="font-medium text-ivory">{t.cardName}</span>
                      <span className="font-display block text-[11.5px] text-ivory-faint">
                        •••• {t.cardLast4}
                      </span>
                    </td>

                    <td className="px-4 py-4 capitalize text-ivory-dim">
                      {t.channel === "online" ? "Online" : "In-Person"}
                    </td>

                    <td className="px-4 py-4 text-ivory-dim">
                      <div>{t.date}</div>
                      <div className="font-display text-[11.5px] text-ivory-faint">{t.time}</div>
                    </td>

                    <td className="px-4 py-4">
                      <span
                        className={clsx(
                          "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold",
                          t.status === "under_review"
                            ? "bg-champagne/15 text-champagne ring-1 ring-champagne/30"
                            : t.status === "completed"
                              ? "bg-sage/15 text-sage ring-1 ring-sage/30"
                              : "bg-ivory/10 text-ivory-dim"
                        )}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        {t.status === "under_review" ? "Under Review" : "Completed"}
                      </span>
                    </td>

                    <td className="py-4 pl-4 pr-6 text-right font-display text-[15px] font-medium text-ivory">
                      ${t.amountUsd.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
