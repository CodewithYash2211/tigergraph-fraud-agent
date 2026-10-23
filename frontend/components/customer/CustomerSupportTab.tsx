"use client";

import { useState } from "react";
import {
  AlertCircle,
  Check,
  ChevronDown,
  Clock,
  Flag,
  HelpCircle,
  LifeBuoy,
  Mail,
  MessageCircle,
  Phone,
  Shield,
  ShieldAlert,
} from "lucide-react";
import clsx from "clsx";
import { FAQ_TOPICS } from "@/lib/mock/customer";
import { useCustomer } from "@/lib/state/customer";

export function CustomerSupportTab({
  onOpenReportModal,
}: {
  onOpenReportModal: () => void;
}) {
  const { supportTickets, transactions } = useCustomer();
  const [openFaq, setOpenFaq] = useState<string | null>("faq-1");

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="font-display text-[12.5px] text-ivory-faint uppercase tracking-wider">
            HELP & DISPUTE CENTRE
          </div>
          <h1 className="mt-1 font-display text-[clamp(26px,3vw,34px)] leading-tight text-ivory">
            Customer Support
          </h1>
          <p className="mt-1 text-[14.5px] text-ivory-dim">
            Preview the support and report flows. No live support or dispute service is connected.
          </p>
        </div>

        <button
          onClick={onOpenReportModal}
          className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-medium self-start sm:self-auto"
        >
          <Flag size={15} />
          <span>Report an unfamiliar transaction</span>
        </button>
      </div>

      {/* Support Channels Banner */}
      <div className="grid gap-4 sm:grid-cols-3">
        <div className="sheet p-5 transition-all hover:shadow-md">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-champagne/15 text-champagne">
            <MessageCircle size={18} />
          </div>
          <h3 className="mt-3 font-display text-[16px] font-semibold text-ivory">Live Chat Support</h3>
          <p className="mt-1 text-[12.5px] text-ivory-dim">A chat service is not connected in this sample portal.</p>
          <button
            onClick={() => alert("Simulated Live Chat: A customer agent will assist you shortly.")}
            className="mt-3 text-[13px] font-medium text-champagne hover:underline"
          >
            Start simulated chat &rarr;
          </button>
        </div>

        <div className="sheet p-5 transition-all hover:shadow-md">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-slate-2 text-ivory">
            <Phone size={18} />
          </div>
          <h3 className="mt-3 font-display text-[16px] font-semibold text-ivory">Priority Phone Care</h3>
          <p className="mt-1 text-[12.5px] text-ivory-dim">No phone service is connected in this sample portal.</p>
          <span className="mt-3 inline-block font-display text-[12.5px] text-ivory-faint">Contact details are not configured</span>
        </div>

        <div className="sheet p-5 transition-all hover:shadow-md">
          <div className="grid h-10 w-10 place-items-center rounded-2xl bg-sage/15 text-sage">
            <Shield size={18} />
          </div>
          <h3 className="mt-3 font-display text-[16px] font-semibold text-ivory">Zero Liability Guarantee</h3>
          <p className="mt-1 text-[12.5px] text-ivory-dim">Account protection and liability services are not connected in this sample portal.</p>
          <span className="mt-3 inline-block text-[12px] text-ivory-faint font-medium">No live account protection status</span>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-[1.4fr_1fr]">
        {/* Left Column: FAQ Accordion */}
        <section className="sheet p-6 sm:p-7 space-y-4">
          <div className="flex items-center gap-2 border-b hairline pb-4">
            <HelpCircle size={18} className="text-champagne" />
            <h2 className="font-display text-[18px]">Frequently Asked Questions</h2>
          </div>

          <div className="divide-y divide-line">
            {FAQ_TOPICS.map((faq) => {
              const isOpen = openFaq === faq.id;

              return (
                <div key={faq.id} className="py-4">
                  <button
                    onClick={() => setOpenFaq(isOpen ? null : faq.id)}
                    aria-expanded={isOpen}
                    className="flex w-full items-center justify-between gap-4 text-left font-medium text-[15px] text-ivory hover:text-champagne transition-colors"
                  >
                    <span>{faq.question}</span>
                    <ChevronDown
                      size={17}
                      className={clsx(
                        "shrink-0 text-ivory-faint transition-transform duration-200",
                        isOpen && "rotate-180 text-champagne"
                      )}
                    />
                  </button>

                  {isOpen && (
                    <p className="mt-2.5 text-[14px] leading-relaxed text-ivory-dim pr-6 animate-in fade-in duration-150">
                      {faq.answer}
                    </p>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Right Column: Dispute History / Tickets */}
        <div className="space-y-6">
          <section className="sheet p-6">
            <div className="flex items-center justify-between border-b hairline pb-4">
              <div className="flex items-center gap-2">
                <Clock size={17} className="text-champagne" />
                <h3 className="font-display text-[16px]">Reported Disputes</h3>
              </div>
              <span className="font-display text-[12px] text-ivory-faint">
                {supportTickets.length} ticket(s)
              </span>
            </div>

            {supportTickets.length === 0 ? (
              <div className="py-8 text-center text-[13px] text-ivory-dim">
                No disputes filed.
              </div>
            ) : (
              <div className="mt-4 space-y-3">
                {supportTickets.map((t) => (
                  <div
                    key={t.id}
                    className="rounded-xl border border-line bg-white/80 p-4 space-y-2 shadow-2xs"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-display text-[12px] font-semibold text-champagne">
                        {t.id}
                      </span>
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[11px] font-semibold",
                          t.status === "under_review"
                            ? "bg-champagne/15 text-champagne"
                            : "bg-sage/15 text-sage"
                        )}
                      >
                        {t.status === "under_review" ? "Under Review" : "Resolved"}
                      </span>
                    </div>

                    <div className="text-[13.5px] font-medium text-ivory">{t.subject}</div>
                    <div className="text-[12px] text-ivory-dim leading-snug">{t.message || t.reason}</div>
                    <div className="text-[11px] font-display text-ivory-faint pt-1">
                      Filed: {t.createdAt} &bull; Est. resolution: {t.estimatedResponse}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          <section className="sheet p-6">
            <h3 className="font-display text-[15px] text-ivory">Dispute Guidelines</h3>
            <ul className="mt-3 space-y-2 text-[12.5px] text-ivory-dim list-disc list-inside leading-relaxed">
              <li>Transactions can be reported up to 60 days after the statement date.</li>
              <li>You will not be held liable for unauthorized charges.</li>
              <li>Temporary credits are applied while the review is active.</li>
            </ul>
          </section>
        </div>
      </div>
    </div>
  );
}
