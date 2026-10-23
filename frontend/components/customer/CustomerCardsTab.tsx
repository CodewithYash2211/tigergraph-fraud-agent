"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  CreditCard,
  Edit2,
  Lock,
  Plus,
  Receipt,
  Shield,
  Star,
  Unlock,
  Wifi,
} from "lucide-react";
import clsx from "clsx";
import { useCustomer } from "@/lib/state/customer";
import { RenameCardModal } from "./CustomerModals";
import type { CustomerCard } from "@/lib/mock/customer";

export function CustomerCardsTab({
  onSelectTab,
  onFilterCardTxns,
}: {
  onSelectTab: (tab: string) => void;
  onFilterCardTxns: (cardId: string) => void;
}) {
  const { cards, toggleCardLock, setPreferredCard, renameCard } = useCustomer();
  const [editingCard, setEditingCard] = useState<CustomerCard | null>(null);

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            CARD MANAGEMENT
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            My Cards
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Preview card controls and default-card settings. Changes stay in this browser session and do not lock a real card.
          </p>
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {cards.map((card) => {
          const isLocked = card.status === "locked";
          const hasReview = card.hasUnderReviewTxn;

          return (
            <div
              key={card.id}
              className={clsx(
                "sheet flex flex-col justify-between overflow-hidden p-6 transition-all hover:shadow-lg",
                hasReview && !isLocked && "ring-1 ring-champagne/40"
              )}
            >
              <div>
                {/* Visual Card Representation */}
                <div
                  className={clsx(
                    "relative aspect-[1.58/1] w-full overflow-hidden rounded-2xl p-5 text-white shadow-md flex flex-col justify-between transition-transform duration-300",
                    isLocked
                      ? "bg-gradient-to-br from-[#3b3a42] to-[#25242b] opacity-80"
                      : card.colorScheme === "coral"
                        ? "bg-gradient-to-br from-champagne via-champagne-deep to-[#aa3a4a]"
                        : card.colorScheme === "sapphire"
                          ? "bg-gradient-to-br from-[#1e1e2d] via-[#2a2a40] to-[#151522]"
                          : "bg-gradient-to-br from-[#9c7d42] via-[#b89552] to-[#7d6028]"
                  )}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-display text-[14px] font-semibold tracking-wider uppercase opacity-90">
                      {card.cardType}
                    </span>
                    <Wifi size={18} className="rotate-90 opacity-80" />
                  </div>

                  {/* Card Number */}
                  <div className="my-auto">
                    <div className="font-display text-[clamp(17px,2.2vw,22px)] font-medium tracking-[0.2em] text-white">
                      •••• •••• •••• {card.last4}
                    </div>
                  </div>

                  {/* Bottom details */}
                  <div className="flex items-end justify-between">
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-white/70">Cardholder</div>
                      <div className="text-[13px] font-medium tracking-wide">ELENA ROSTOVA</div>
                    </div>
                    <div>
                      <div className="text-[9px] uppercase tracking-wider text-white/70">Expires</div>
                      <div className="font-display text-[13px] tracking-wider">
                        {card.expiryMonth}/{card.expiryYear}
                      </div>
                    </div>
                    <div className="font-display text-[16px] font-bold italic tracking-tight">
                      {card.brand}
                    </div>
                  </div>

                  {/* Locked Overlay Badge */}
                  {isLocked && (
                    <div className="absolute inset-0 flex items-center justify-center bg-black/40 backdrop-blur-[1px]">
                      <div className="flex items-center gap-1.5 rounded-full bg-crimson px-3 py-1 text-[12px] font-semibold text-white shadow-md">
                        <Lock size={13} />
                        <span>Card Locked</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Title & Badges */}
                <div className="mt-5 flex items-center justify-between">
                  <div>
                    <h3 className="font-display text-[16.5px] font-semibold text-ivory">
                      {card.nickname}
                    </h3>
                    <span className="font-display text-[12px] text-ivory-faint">
                      {card.id} &bull; {card.cardType}
                    </span>
                  </div>

                  {card.isPrimary && (
                    <span className="flex items-center gap-1 rounded-full bg-champagne/15 px-2.5 py-0.5 text-[11.5px] font-semibold text-champagne ring-1 ring-champagne/30">
                      <Star size={11} className="fill-current" />
                      <span>Primary</span>
                    </span>
                  )}
                </div>

                {/* Safe Investigation Warning */}
                {hasReview && (
                  <div className="mt-3.5 flex items-start gap-2.5 rounded-xl border border-champagne/30 bg-champagne/[0.08] p-3 text-[12.5px] text-ivory">
                    <AlertCircle size={15} className="mt-0.5 shrink-0 text-champagne" />
                    <span>This card has a transaction currently under review.</span>
                  </div>
                )}

                {/* Card Stats */}
                <dl className="mt-4 space-y-2 border-t hairline pt-3.5 text-[13px]">
                  <div className="flex justify-between text-ivory-dim">
                    <span>Monthly limit:</span>
                    <span className="font-display font-medium text-ivory">${card.monthlyLimitUsd.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-ivory-dim">
                    <span>Linked devices:</span>
                    <span className="font-medium text-ivory">{card.linkedDevicesCount} device(s)</span>
                  </div>
                </dl>
              </div>

              {/* Action Buttons */}
              <div className="mt-6 space-y-2 border-t hairline pt-4">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => toggleCardLock(card.id)}
                    className={clsx(
                      "flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px] font-medium transition-colors ring-1",
                      isLocked
                        ? "bg-sage text-white ring-sage hover:bg-sage/90"
                        : "bg-white text-ivory ring-line hover:bg-slate-2"
                    )}
                  >
                    {isLocked ? (
                      <>
                        <Unlock size={14} /> Unlock card
                      </>
                    ) : (
                      <>
                        <Lock size={14} /> Lock card
                      </>
                    )}
                  </button>

                  <button
                    onClick={() => setEditingCard(card)}
                    className="btn-quiet flex items-center justify-center gap-1.5 rounded-xl py-2.5 text-[13px]"
                  >
                    <Edit2 size={14} /> Rename
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  {!card.isPrimary && (
                    <button
                      onClick={() => setPreferredCard(card.id)}
                      className="btn-quiet flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12.5px]"
                    >
                      <Star size={13} /> Set default
                    </button>
                  )}
                  <button
                    onClick={() => {
                      onFilterCardTxns(card.id);
                      onSelectTab("transactions");
                    }}
                    className={clsx(
                      "flex items-center justify-center gap-1.5 rounded-xl py-2 text-[12.5px] text-ivory-dim hover:text-ivory hover:underline",
                      card.isPrimary ? "col-span-2" : ""
                    )}
                  >
                    <Receipt size={13} /> View activity
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Rename Card Modal */}
      <RenameCardModal
        card={editingCard}
        isOpen={!!editingCard}
        onClose={() => setEditingCard(null)}
        onSave={renameCard}
      />
    </div>
  );
}
