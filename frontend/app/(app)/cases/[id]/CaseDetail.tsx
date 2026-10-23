"use client";

import Link from "next/link";
import clsx from "clsx";
import { AlertCircle, Loader2, Play, RefreshCw } from "lucide-react";
import { getCase, getSimilarCases } from "@/lib/data/adapter";
import { useAnswer } from "@/lib/data/hooks";
import { PATTERN_LABEL, TRIGGER_LABEL, money } from "@/lib/data/labels";
import { CaseProgress } from "@/components/investigation/CaseProgress";
import { BankScore } from "@/components/investigation/Assessment";
import {
  AwaitingAnswer,
  CasePanel,
  EvidenceList,
  EvidenceRequests,
  NbaPanel,
  SarPanel,
  SourceBadge,
  StopReason,
} from "@/components/case/AnswerParts";
import { PageHeader, Skeleton, StatePanel } from "@/components/ui/primitives";
import { useInvestigation } from "@/lib/state/investigation";

export function CaseDetail({ id }: { id: string }) {
  const c = getCase(id);
  const { openCase } = useInvestigation();
  const { loading, data, error, isInvestigating, investigationError, triggerInvestigation } =
    useAnswer(id);

  if (!c) {
    return (
      <div className="sheet">
        <StatePanel
          kind="error"
          title="Case not found"
          body={`${id} is not in case_pack.csv.`}
          action={{ label: "Back to cases", href: "/cases" }}
        />
      </div>
    );
  }

  const a = data?.answer;
  const at = !a
    ? 0
    : a.case.status === "open"
      ? 3
      : a.case.status === "escalated"
        ? 4
        : 5;
  const memory = getSimilarCases(id, a);

  const handleRunInvestigation = () => {
    triggerInvestigation(c.flagged_txn_id);
  };

  return (
    <>
      <PageHeader
        context={
          <span className="tnum">
            Opened {c.opened_at}, {TRIGGER_LABEL[c.trigger_type].toLowerCase()}
          </span>
        }
        title={c.case_id}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {data && <SourceBadge source={data.source} />}

            {/* Run / Re-run Backend Investigation Button */}
            <button
              onClick={handleRunInvestigation}
              disabled={isInvestigating}
              className="btn-primary inline-flex items-center gap-2 rounded-xl px-5 py-2.5 text-[14px] font-medium disabled:opacity-80 shadow-sm transition-all"
            >
              {isInvestigating ? (
                <>
                  <Loader2 size={16} className="animate-spin" />
                  <span>Investigating backend...</span>
                </>
              ) : (
                <>
                  {data ? <RefreshCw size={14} /> : <Play size={14} />}
                  <span>{data ? "Re-run investigation" : "Run investigation"}</span>
                </>
              )}
            </button>

            <Link
              href="/investigate"
              onClick={() => openCase(id)}
              className="btn-quiet rounded-xl px-4 py-2.5 text-[14px]"
            >
              Open in studio
            </Link>
          </div>
        }
      />

      {/* Investigation Error Alert */}
      {investigationError && (
        <div className="mb-5 flex items-start justify-between gap-3 rounded-2xl border border-crimson/30 bg-crimson/[0.08] p-4 text-[13.5px] text-ivory">
          <div className="flex items-start gap-2.5">
            <AlertCircle size={18} className="mt-0.5 shrink-0 text-crimson" />
            <div>
              <span className="font-semibold text-crimson">Backend Investigation Error: </span>
              <span>{investigationError}</span>
            </div>
          </div>
          <button
            onClick={handleRunInvestigation}
            className="btn-quiet shrink-0 rounded-lg px-3 py-1 text-[12.5px]"
          >
            Retry
          </button>
        </div>
      )}

      {/* Active Backend Running Card */}
      {isInvestigating && (
        <div className="sheet mb-5 p-6 sm:p-7 animate-in fade-in">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-xl bg-champagne/15 text-champagne">
              <Loader2 size={22} className="animate-spin" />
            </div>
            <div>
              <h3 className="font-display text-[17px] font-semibold text-ivory">
                Running backend investigation
              </h3>
              <p className="text-[13px] text-ivory-dim">
                Sending a request through <code className="font-display text-[12px] bg-slate px-1 rounded">POST /api/investigate</code>. Intermediate backend progress is not streamed.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="sheet mb-5 px-6 py-5 sm:px-8">
        <CaseProgress at={at} />
      </section>

      <div className="mb-5 grid gap-5 lg:grid-cols-[1.4fr_1fr]">
        <section className="sheet p-6 sm:p-7">
          <div className="text-[12px] text-ivory-faint">Alert</div>
          <p className="mt-1 text-[15px] leading-relaxed">{c.trigger_text}</p>
          <dl className="mt-5 grid grid-cols-2 gap-x-6 gap-y-3 border-t hairline pt-4 text-[13.5px] sm:grid-cols-4">
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Flagged txn</dt>
              <dd>
                <Link
                  href={`/transactions/${c.flagged_txn_id}/`}
                  className="font-display hover:text-champagne"
                >
                  {c.flagged_txn_id}
                </Link>
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Card</dt>
              <dd className="font-display">{c.card_id}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Customer</dt>
              <dd className="font-display">{c.customer_id}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Amount</dt>
              <dd className="tnum">{money(c.amount_usd)}</dd>
            </div>
          </dl>
        </section>

        <section className="sheet flex flex-col gap-4 p-6 sm:p-7">
          <BankScore
            score={c.risk_score}
            trigger={TRIGGER_LABEL[c.trigger_type].toLowerCase()}
          />
          <div className="rounded-xl bg-white/70 px-4 py-3 ring-1 ring-line">
            <div className="text-[12px] text-ivory-faint">Assessment input · existing risk_score</div>
            {loading && !a ? (
              <Skeleton className="mt-2 h-5 w-32" />
            ) : a ? (
              <div className="mt-0.5 flex items-baseline gap-3">
                <span
                  className={clsx(
                    "font-display text-[22px] tnum font-semibold",
                    a.case.fraud_probability !== null && a.case.fraud_probability >= 0.85
                      ? "text-crimson"
                      : "text-champagne"
                  )}
                >
                  {a.case.fraud_probability?.toFixed(2) ?? "Not reported"}
                </span>
                <span className="text-[13px] text-ivory-dim">
                  {PATTERN_LABEL[a.case.pattern]}
                </span>
              </div>
            ) : (
              <div className="mt-0.5 text-[13.5px] text-ivory-dim">
                Not assessed yet (Click "Run investigation" above)
              </div>
            )}
          </div>
        </section>
      </div>

      {c.device && (
        <section className="sheet mb-5 p-6 sm:p-7">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <h2 className="font-display text-[17px]">Device record</h2>
            <span className="text-[12px] text-ivory-faint">
              identity.csv, online transactions only
            </span>
          </div>
          <div className="mt-2 font-display text-[13px]">{c.device.profile}</div>
          <dl className="mt-3 flex flex-wrap gap-x-8 gap-y-2 text-[13px]">
            <div>
              <dt className="text-[11.5px] text-ivory-faint">id_15 (device)</dt>
              <dd className={c.device.new_for_account === "New" ? "text-champagne" : ""}>
                {c.device.new_for_account ?? "–"}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">id_23 (proxy)</dt>
              <dd
                className={
                  c.device.proxy?.includes("ANONYMOUS") ? "text-crimson" : ""
                }
              >
                {c.device.proxy ?? "none"}
              </dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Type</dt>
              <dd>{c.device.device_type ?? "–"}</dd>
            </div>
            <div>
              <dt className="text-[11.5px] text-ivory-faint">Same profile</dt>
              <dd className="tnum">{c.device_neighbour_count} identity records</dd>
            </div>
          </dl>
        </section>
      )}

      {error ? (
        <div className="sheet mb-5">
          <StatePanel
            kind="error"
            title="Couldn't load answer"
            body="An error occurred fetching the answer file."
            action={{ label: "Run backend investigation", onClick: handleRunInvestigation }}
          />
        </div>
      ) : loading && !a ? (
        <div className="sheet mb-5 space-y-3 p-7">
          <Skeleton className="h-4 w-1/3" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      ) : !a ? (
        <div className="mb-5">
          <AwaitingAnswer
            caseId={id}
            onInvestigate={handleRunInvestigation}
            isInvestigating={isInvestigating}
          />
        </div>
      ) : (
        <div className="mb-5 space-y-5">
          <CasePanel a={a} />
          <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
            <NbaPanel a={a} />
            <div className="space-y-5">
              <EvidenceRequests a={a} />
              <StopReason a={a} />
            </div>
          </div>
          <SarPanel a={a} />
          <EvidenceList a={a} />
        </div>
      )}

      <section className="sheet p-6 sm:p-7">
        <h2 className="font-display text-[17px]">Case memory</h2>
        <p className="mt-1 text-[13px] text-ivory-dim">
          Closed cases the investigation can learn from.
        </p>
        {memory.length === 0 ? (
          <p className="mt-4 text-[13.5px] text-ivory-dim">
            No closed case shares this customer or device profile.
          </p>
        ) : (
          <ul className="mt-3 divide-y divide-line">
            {memory.slice(0, 8).map(({ closed: m, why }) => (
              <li
                key={m.case_id}
                className="grid gap-1 py-3 text-[13px] md:grid-cols-[90px_140px_1fr_180px]"
              >
                <span className="font-display">{m.case_id}</span>
                <span
                  className={
                    m.outcome === "confirmed_fraud" ? "text-crimson" : "text-sage"
                  }
                >
                  {m.outcome === "confirmed_fraud" ? "Confirmed fraud" : "Cleared"}
                </span>
                <span className="text-ivory-dim">
                  {PATTERN_LABEL[m.pattern]}, {m.card_id}, {money(m.exposure_usd)}
                </span>
                <span className="text-[12px] text-ivory-faint">{why}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </>
  );
}
