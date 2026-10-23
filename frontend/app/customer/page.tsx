"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useInvestigation } from "@/lib/state/investigation";
import { useCustomer } from "@/lib/state/customer";
import { CustomerHeader } from "@/components/customer/CustomerHeader";
import { CustomerSidebarNav } from "@/components/customer/CustomerNav";
import { CustomerOverviewTab } from "@/components/customer/CustomerOverviewTab";
import { CustomerAccountTab } from "@/components/customer/CustomerAccountTab";
import { CustomerCardsTab } from "@/components/customer/CustomerCardsTab";
import { CustomerDevicesTab } from "@/components/customer/CustomerDevicesTab";
import { CustomerTransactionsTab } from "@/components/customer/CustomerTransactionsTab";
import { CustomerSecurityTab } from "@/components/customer/CustomerSecurityTab";
import { CustomerNotificationsTab } from "@/components/customer/CustomerNotificationsTab";
import { CustomerPreferencesTab } from "@/components/customer/CustomerPreferencesTab";
import { CustomerSupportTab } from "@/components/customer/CustomerSupportTab";
import {
  CustomerTransactionDetailModal,
  ReportTransactionModal,
} from "@/components/customer/CustomerModals";
import type { CustomerTransaction } from "@/lib/mock/customer";

function CustomerWorkspaceContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { hydrated, authed, role } = useInvestigation();
  const { transactions, submitTransactionReport } = useCustomer();

  // Tab State: overview | account | cards | devices | transactions | security | notifications | preferences | support
  const initialTab = searchParams.get("tab") || "overview";
  const [activeTab, setActiveTab] = useState<string>(initialTab);

  // Filter pass-through state
  const [cardFilterForTxns, setCardFilterForTxns] = useState<string | null>(null);

  // Modals state
  const [reportModalOpen, setReportModalOpen] = useState(false);
  const [prefilledTxnForReport, setPrefilledTxnForReport] = useState<CustomerTransaction | null>(null);
  const [selectedTxnForDetail, setSelectedTxnForDetail] = useState<CustomerTransaction | null>(null);

  useEffect(() => {
    const tabParam = searchParams.get("tab");
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [searchParams]);

  useEffect(() => {
    if (!hydrated) return;
    if (!authed) router.replace("/verify");
    else if (role !== "customer") router.replace(role === "analyst" ? "/overview" : "/role");
  }, [hydrated, authed, role, router]);

  const handleSelectTab = (tab: string) => {
    setActiveTab(tab);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleOpenTxnDetail = (txn: CustomerTransaction) => {
    setSelectedTxnForDetail(txn);
  };

  const handleOpenReportModal = (txn?: CustomerTransaction) => {
    setPrefilledTxnForReport(txn || null);
    setReportModalOpen(true);
  };

  const handleFilterCardTxns = (cardId: string) => {
    setCardFilterForTxns(cardId);
    setActiveTab("transactions");
  };

  if (!hydrated || !authed || role !== "customer") {
    return (
      <div className="grid min-h-dvh place-items-center text-[14px] text-ivory-faint">
        Checking your session...
      </div>
    );
  }

  return (
    <div className="customer-shell min-h-dvh flex flex-col">
      {/* Top Header */}
      <CustomerHeader activeTab={activeTab} onSelectTab={handleSelectTab} />

      {/* Main Workspace Body */}
      <main className="flex-1">
        <div className="mx-auto w-full max-w-[1480px] px-4 pb-20 pt-8 sm:px-6 lg:px-10">
          <div role="note" className="mb-6 rounded-xl border border-champagne/25 bg-champagne/[0.05] px-4 py-3 text-[12.5px] leading-relaxed text-ivory-dim">
            Sample customer data and local-only controls. This portal is not connected to customer, card, support, or reporting services; changes here do not affect real accounts.
          </div>
          <div className="flex flex-col lg:flex-row lg:items-start gap-8">
            {/* Left Nav Sidebar */}
            <CustomerSidebarNav activeTab={activeTab} onSelectTab={handleSelectTab} />

            {/* Right Active Tab Content */}
            <section className="flex-1 min-w-0" aria-live="polite">
              {activeTab === "overview" && (
                <CustomerOverviewTab
                  onSelectTab={handleSelectTab}
                  onOpenTxnDetail={handleOpenTxnDetail}
                  onOpenReportModal={handleOpenReportModal}
                />
              )}

              {activeTab === "account" && <CustomerAccountTab />}

              {activeTab === "cards" && (
                <CustomerCardsTab
                  onSelectTab={handleSelectTab}
                  onFilterCardTxns={handleFilterCardTxns}
                />
              )}

              {activeTab === "devices" && <CustomerDevicesTab />}

              {activeTab === "transactions" && (
                <CustomerTransactionsTab
                  selectedCardFilter={cardFilterForTxns}
                  onOpenTxnDetail={handleOpenTxnDetail}
                  onOpenReportModal={handleOpenReportModal}
                />
              )}

              {activeTab === "security" && (
                <CustomerSecurityTab onSelectTab={handleSelectTab} />
              )}

              {activeTab === "notifications" && (
                <CustomerNotificationsTab onSelectTab={handleSelectTab} />
              )}

              {activeTab === "preferences" && <CustomerPreferencesTab />}

              {activeTab === "support" && (
                <CustomerSupportTab onOpenReportModal={() => handleOpenReportModal()} />
              )}
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t hairline bg-graphite/40">
        <div className="mx-auto flex w-full max-w-[1480px] flex-wrap items-center justify-between gap-3 px-4 py-6 text-[12.5px] text-ivory-faint sm:px-6 lg:px-10">
          <span>TigerGraph Fraud Investigation &bull; Customer Portal (Demo Mode)</span>
          <span>Simulated frontend session &bull; Zero real financial actions or transactions</span>
        </div>
      </footer>

      {/* Global Modals */}
      <ReportTransactionModal
        isOpen={reportModalOpen}
        prefilledTxn={prefilledTxnForReport}
        transactions={transactions}
        onClose={() => setReportModalOpen(false)}
        onSubmitReport={submitTransactionReport}
      />

      <CustomerTransactionDetailModal
        isOpen={!!selectedTxnForDetail}
        transaction={selectedTxnForDetail}
        onClose={() => setSelectedTxnForDetail(null)}
        onOpenReport={handleOpenReportModal}
      />
    </div>
  );
}

export default function CustomerPage() {
  return (
    <Suspense fallback={<div className="grid min-h-dvh place-items-center text-[14px] text-ivory-faint">Loading Customer Portal...</div>}>
      <CustomerWorkspaceContent />
    </Suspense>
  );
}
