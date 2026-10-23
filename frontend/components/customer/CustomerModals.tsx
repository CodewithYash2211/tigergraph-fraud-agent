"use client";

import { AnimatePresence, motion } from "motion/react";
import {
  AlertCircle,
  AlertTriangle,
  Building2,
  Check,
  CreditCard,
  Flag,
  Globe,
  HelpCircle,
  Laptop,
  Lock,
  MapPin,
  Receipt,
  ShieldCheck,
  Smartphone,
  Tablet,
  X,
} from "lucide-react";
import { useState } from "react";
import clsx from "clsx";
import type { CustomerCard, CustomerDevice, CustomerTransaction } from "@/lib/mock/customer";

export function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-ivory/30 backdrop-blur-xs"
      />
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 8 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 8 }}
        transition={{ duration: 0.2 }}
        className="relative z-10 w-full max-w-lg overflow-hidden rounded-2xl border hairline bg-white p-6 sm:p-7 shadow-2xl"
      >
        {children}
      </motion.div>
    </div>
  );
}

/** ------------------------------------------------ Change Password Modal */
export function ChangePasswordModal({
  isOpen,
  onClose,
  onSave,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSave: (curr: string, next: string) => boolean;
}) {
  const [current, setCurrent] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!current) {
      setError("Please enter your current password.");
      return;
    }
    if (newPass.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }
    if (newPass !== confirmPass) {
      setError("New passwords do not match.");
      return;
    }

    const ok = onSave(current, newPass);
    if (ok) {
      setSuccess(true);
      setError(null);
      setTimeout(() => {
        setSuccess(false);
        setCurrent("");
        setNewPass("");
        setConfirmPass("");
        onClose();
      }, 1400);
    }
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-ivory">
          <Lock size={18} className="text-champagne" />
          <h3 className="font-display text-[18px]">Change password</h3>
        </div>
        <button
          onClick={onClose}
          className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2 hover:text-ivory"
        >
          <X size={16} />
        </button>
      </div>

      <p className="mt-2 text-[13.5px] leading-relaxed text-ivory-dim">
        Update your account login password. Any combination of 8+ characters works in the demo.
      </p>

      {success ? (
        <div className="mt-6 flex flex-col items-center py-6 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-sage/15 text-sage">
            <Check size={24} strokeWidth={2.5} />
          </div>
          <p className="mt-3 font-medium text-ivory">Password updated successfully</p>
          <p className="mt-1 text-[13px] text-ivory-dim">Your simulated security settings have been updated.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-6 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">Current password</label>
            <input
              type="password"
              value={current}
              onChange={(e) => setCurrent(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">New password</label>
            <input
              type="password"
              value={newPass}
              onChange={(e) => setNewPass(e.target.value)}
              placeholder="At least 8 characters"
              className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            />
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">Confirm new password</label>
            <input
              type="password"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
              placeholder="Re-enter new password"
              className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            />
          </div>

          {error && (
            <p className="text-[13px] text-crimson" role="alert">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-3 pt-3">
            <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-4 py-2.5 text-[13.5px]">
              Cancel
            </button>
            <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-[13.5px] font-medium">
              Save changes
            </button>
          </div>
        </form>
      )}
    </ModalBackdrop>
  );
}

/** ------------------------------------------------ Remove Device Modal */
export function RemoveDeviceModal({
  device,
  isOpen,
  onClose,
  onConfirm,
}: {
  device: CustomerDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (deviceId: string) => void;
}) {
  if (!isOpen || !device) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center gap-3 text-crimson">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-crimson/10">
          <AlertTriangle size={20} />
        </div>
        <div>
          <h3 className="font-display text-[18px] text-ivory">Remove device</h3>
          <p className="text-[12.5px] text-ivory-faint">{device.name}</p>
        </div>
      </div>

      <div className="mt-4 rounded-xl border border-line bg-slate/50 p-4 text-[13.5px] space-y-2">
        <div className="flex justify-between text-ivory-dim">
          <span>Operating System:</span>
          <span className="font-medium text-ivory">{device.os}</span>
        </div>
        <div className="flex justify-between text-ivory-dim">
          <span>Approx. Location:</span>
          <span className="font-medium text-ivory">{device.location}</span>
        </div>
        <div className="flex justify-between text-ivory-dim">
          <span>Last Active:</span>
          <span className="font-medium text-ivory">{device.lastActive}</span>
        </div>
      </div>

      <p className="mt-4 text-[13.5px] leading-relaxed text-ivory-dim">
        Are you sure you want to sign out and remove this device? It will be disconnected immediately and will require two-step verification to sign in again.
      </p>

      <div className="mt-6 flex items-center justify-end gap-3">
        <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-4 py-2.5 text-[13.5px]">
          Cancel
        </button>
        <button
          type="button"
          onClick={() => {
            onConfirm(device.id);
            onClose();
          }}
          className="inline-flex items-center gap-1.5 rounded-xl bg-crimson px-5 py-2.5 text-[13.5px] font-medium text-white shadow-sm hover:bg-crimson/90 transition-colors"
        >
          Remove device
        </button>
      </div>
    </ModalBackdrop>
  );
}

/** ------------------------------------------------ Rename Card Modal */
export function RenameCardModal({
  card,
  isOpen,
  onClose,
  onSave,
}: {
  card: CustomerCard | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (cardId: string, name: string) => void;
}) {
  const [name, setName] = useState(card?.nickname || "");

  if (!isOpen || !card) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <CreditCard size={18} className="text-champagne" />
          <h3 className="font-display text-[18px]">Rename card</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2">
          <X size={16} />
        </button>
      </div>

      <p className="mt-2 text-[13.5px] text-ivory-dim">
        Give your card (•{card.last4}) a custom nickname to help organize your payments.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onSave(card.id, name.trim());
            onClose();
          }
        }}
        className="mt-5 space-y-4"
      >
        <div>
          <label className="block text-[12.5px] font-medium text-ivory-dim">Card nickname</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Travel Rewards Card"
            className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-4 py-2.5 text-[13.5px]">
            Cancel
          </button>
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-[13.5px] font-medium">
            Save
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

/** ------------------------------------------------ Rename Device Modal */
export function RenameDeviceModal({
  device,
  isOpen,
  onClose,
  onSave,
}: {
  device: CustomerDevice | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (deviceId: string, name: string) => void;
}) {
  const [name, setName] = useState(device?.name || "");

  if (!isOpen || !device) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Laptop size={18} className="text-champagne" />
          <h3 className="font-display text-[18px]">Rename device</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2">
          <X size={16} />
        </button>
      </div>

      <p className="mt-2 text-[13.5px] text-ivory-dim">
        Choose a recognizable label for this device in your security dashboard.
      </p>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (name.trim()) {
            onSave(device.id, name.trim());
            onClose();
          }
        }}
        className="mt-5 space-y-4"
      >
        <div>
          <label className="block text-[12.5px] font-medium text-ivory-dim">Device name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Work MacBook"
            className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
          />
        </div>

        <div className="flex items-center justify-end gap-3 pt-2">
          <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-4 py-2.5 text-[13.5px]">
            Cancel
          </button>
          <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-[13.5px] font-medium">
            Save
          </button>
        </div>
      </form>
    </ModalBackdrop>
  );
}

/** ------------------------------------------------ Report Unfamiliar Transaction Modal */
export function ReportTransactionModal({
  isOpen,
  prefilledTxn,
  transactions,
  onClose,
  onSubmitReport,
}: {
  isOpen: boolean;
  prefilledTxn?: CustomerTransaction | null;
  transactions: CustomerTransaction[];
  onClose: () => void;
  onSubmitReport: (txnId: string, reason: string, message: string) => { ticketId: string };
}) {
  const [selectedTxnId, setSelectedTxnId] = useState(prefilledTxn?.id || (transactions[0]?.id ?? ""));
  const [reason, setReason] = useState("I did not authorize or make this transaction");
  const [details, setDetails] = useState("");
  const [submittedTicket, setSubmittedTicket] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const result = onSubmitReport(selectedTxnId, reason, details);
    setSubmittedTicket(result.ticketId);
  };

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Flag size={18} className="text-crimson" />
          <h3 className="font-display text-[18px]">Report an unfamiliar transaction</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2">
          <X size={16} />
        </button>
      </div>

      {submittedTicket ? (
        <div className="mt-6 flex flex-col items-center py-4 text-center">
          <div className="grid h-12 w-12 place-items-center rounded-full bg-sage/15 text-sage">
            <ShieldCheck size={26} strokeWidth={2.2} />
          </div>
          <h4 className="mt-3 font-display text-[18px] text-ivory">Local report preview created</h4>
          <p className="mt-1 font-display text-[13px] text-ivory-faint">Demo reference only: {submittedTicket}</p>
          <p className="mt-3 max-w-sm text-[13.5px] leading-relaxed text-ivory-dim">
            Nothing was sent to a bank, support team, or investigation backend. This preview does not change card, account, or report status.
          </p>
          <button
            type="button"
            onClick={() => {
              setSubmittedTicket(null);
              onClose();
            }}
            className="btn-primary mt-6 rounded-xl px-6 py-2.5 text-[14px] font-medium"
          >
            Done
          </button>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="mt-5 space-y-4">
          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">Select transaction</label>
            <select
              value={selectedTxnId}
              onChange={(e) => setSelectedTxnId(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            >
              {transactions.map((t) => (
                <option key={t.id} value={t.id}>
                  TXN #{t.id} — ${t.amountUsd.toFixed(2)} at {t.merchant} ({t.date})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">Reason for report</label>
            <select
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="mt-1.5 w-full rounded-xl bg-slate/60 px-4 py-2.5 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            >
              <option value="I did not authorize or make this transaction">I did not authorize or make this transaction</option>
              <option value="Incorrect amount was charged">Incorrect amount was charged</option>
              <option value="Paid with another method">Paid with another method</option>
              <option value="Merchandise was not received">Merchandise was not received</option>
              <option value="Recurring charge after cancellation">Recurring charge after cancellation</option>
              <option value="Other security concern">Other security concern</option>
            </select>
          </div>

          <div>
            <label className="block text-[12.5px] font-medium text-ivory-dim">
              Additional details <span className="text-ivory-faint font-normal">(optional)</span>
            </label>
            <textarea
              rows={3}
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              placeholder="Provide any additional context (e.g. lost card, recent travel)..."
              className="mt-1.5 w-full rounded-xl bg-slate/60 p-3 text-[14px] ring-1 ring-line focus:bg-white focus:outline-none focus:ring-champagne"
            />
          </div>

          <div className="rounded-xl bg-slate/60 p-3 text-[12px] text-ivory-faint leading-relaxed">
            Local demo only: submitting creates a browser-session preview. No report is sent and no support ticket is created in a backend.
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-4 py-2.5 text-[13.5px]">
              Cancel
            </button>
            <button type="submit" className="btn-primary rounded-xl px-5 py-2.5 text-[13.5px] font-medium">
              Create local preview
            </button>
          </div>
        </form>
      )}
    </ModalBackdrop>
  );
}

/** ------------------------------------------------ Customer-Safe Transaction Detail Modal */
export function CustomerTransactionDetailModal({
  transaction,
  isOpen,
  onClose,
  onOpenReport,
}: {
  transaction: CustomerTransaction | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReport: (txn: CustomerTransaction) => void;
}) {
  if (!isOpen || !transaction) return null;

  return (
    <ModalBackdrop onClose={onClose}>
      <div className="flex items-center justify-between border-b hairline pb-4">
        <div>
          <span className="font-display text-[12px] text-ivory-faint">TRANSACTION DETAILS</span>
          <h3 className="font-display text-[20px] text-ivory">TXN #{transaction.id}</h3>
        </div>
        <button onClick={onClose} className="rounded-lg p-1.5 text-ivory-faint hover:bg-slate-2">
          <X size={16} />
        </button>
      </div>

      {/* Amount and Merchant Banner */}
      <div className="mt-5 rounded-2xl bg-gradient-to-br from-slate to-slate-2 p-5 ring-1 ring-line">
        <div className="flex items-baseline justify-between">
          <span className="font-display text-[28px] font-semibold text-ivory">
            ${transaction.amountUsd.toFixed(2)}
          </span>
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-[12px] font-medium ring-1 capitalize",
              transaction.status === "under_review"
                ? "bg-champagne/15 text-champagne ring-champagne/30"
                : transaction.status === "completed"
                  ? "bg-sage/15 text-sage ring-sage/30"
                  : "bg-ivory/10 text-ivory-dim ring-ivory/20"
            )}
          >
            {transaction.status.replace("_", " ")}
          </span>
        </div>
        <div className="mt-2 text-[14px] text-ivory font-medium">{transaction.merchant}</div>
        <div className="text-[12.5px] text-ivory-dim">{transaction.category} &bull; {transaction.channel === "online" ? "Online Purchase" : "In-Person Payment"}</div>
      </div>

      {/* Safe Customer Notice */}
      {transaction.status === "under_review" && (
        <div className="mt-4 flex items-start gap-3 rounded-xl border border-champagne/30 bg-champagne/[0.08] p-4 text-[13px] text-ivory">
          <AlertCircle size={17} className="mt-0.5 shrink-0 text-champagne" />
          <div>
            <div className="font-medium text-champagne">Your transaction is currently under review</div>
            <div className="mt-1 text-ivory-dim leading-relaxed">
              Our automated safeguards flagged this transaction for verification. Your account remains protected and no unexpected charges will be finalized without verification.
            </div>
          </div>
        </div>
      )}

      {/* Detail Breakdown */}
      <dl className="mt-5 divide-y divide-line text-[13.5px]">
        <div className="flex justify-between py-2.5">
          <dt className="text-ivory-dim">Date & Time</dt>
          <dd className="font-medium text-ivory">{transaction.date} at {transaction.time}</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt className="text-ivory-dim">Payment Card</dt>
          <dd className="font-medium text-ivory">{transaction.cardName} (•{transaction.cardLast4})</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt className="text-ivory-dim">Location</dt>
          <dd className="font-medium text-ivory">{transaction.location}</dd>
        </div>
        <div className="flex justify-between py-2.5">
          <dt className="text-ivory-dim">Description</dt>
          <dd className="font-medium text-ivory text-right max-w-[240px]">{transaction.description}</dd>
        </div>
      </dl>

      <div className="mt-6 flex items-center justify-between gap-3 pt-2">
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenReport(transaction);
          }}
          className="inline-flex items-center gap-1.5 text-[13px] text-crimson hover:underline"
        >
          <Flag size={14} /> Report an issue with this charge
        </button>
        <button type="button" onClick={onClose} className="btn-quiet rounded-xl px-5 py-2.5 text-[13.5px]">
          Close
        </button>
      </div>
    </ModalBackdrop>
  );
}
