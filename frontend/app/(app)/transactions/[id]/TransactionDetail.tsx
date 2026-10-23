"use client";

import Link from "next/link";
import clsx from "clsx";
import { getRelatedTransactions, getSimilarCases, getTransaction } from "@/lib/data/adapter";
import { useAnswer } from "@/lib/data/hooks";
import { PATTERN_LABEL, TRIGGER_LABEL, money } from "@/lib/data/labels";
import { BankScore } from "@/components/investigation/Assessment";
import { SourceBadge } from "@/components/case/AnswerParts";
import { PageHeader, Skeleton, StatePanel } from "@/components/ui/primitives";
import { getCase } from "@/lib/data/adapter";

export function TransactionDetail({ id }: { id: string }) {
  const t = getTransaction(id);
  const { loading, data } = useAnswer(t?.case_id ?? "");
  if (!t) return <div className="sheet"><StatePanel kind="error" title="Transaction not in this demo" body={`The frontend carries the 20 flagged transactions. ${id} would come from TigerGraph.`} action={{ label: "Back to cases", href: "/cases" }} /></div>;
  const c = getCase(t.case_id)!;
  const a = data?.answer.case;
  const inEpisode = a?.affected_txn_ids.includes(t.txn_id);
  const related = getRelatedTransactions(t.txn_id);
  const memory = getSimilarCases(t.case_id, data?.answer).slice(0, 4);

  const fields: [string, React.ReactNode, boolean?][] = [
    ["Transaction ID", t.txn_id], ["Timestamp", <span key="ts">in transactions.csv <span className="text-ivory-faint">(alert {t.alert_time})</span></span>],
    ["Channel", t.channel?.replace("_", " ") ?? "–"], ["Product", t.product ?? (t.channel === "online" ? "non-W (online)" : "–")],
    ["Card", t.card_id], ["Customer", `${t.customer_id} OWNS ${t.card_id}`],
    ["Billing region", t.billing_region ?? "–"], ["Email domain", t.email_domain ?? "in transactions.csv"],
    ["Device", t.device ? t.device.profile : "No identity record (in person)", !!t.device?.proxy],
  ];

  return (
    <>
      <PageHeader context={<Link href={`/cases/${t.case_id}/`} className="hover:text-ivory">{t.case_id}</Link>} title={`Transaction ${t.txn_id}`} />

      <section className="sheet relative overflow-hidden p-6 sm:p-9">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr]">
          <div>
            <div className="flex items-center gap-2 text-[13px] text-crimson"><span className="h-2 w-2 rounded-full bg-crimson" /> Flagged, {TRIGGER_LABEL[c.trigger_type].toLowerCase()}</div>
            {t.amount_usd !== null ? <div className="mt-3 font-display text-[clamp(36px,5vw,64px)] leading-[0.95] tnum">{money(t.amount_usd)}</div> : <div className="mt-3 font-display text-[clamp(26px,3vw,36px)] leading-tight">Online transaction</div>}
            {t.amount_usd === null && <p className="mt-2 text-[13px] text-ivory-dim">The alert text doesn&rsquo;t state the amount; it comes from transactions.csv via TigerGraph.</p>}
            <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ivory-dim">{c.trigger_text}</p>
          </div>
          <div className="space-y-3">
            <BankScore score={t.risk_score} trigger={TRIGGER_LABEL[c.trigger_type].toLowerCase()} />
            <div className="rounded-xl bg-white/70 px-4 py-3 ring-1 ring-line">
              <div className="flex items-center justify-between gap-2"><span className="text-[12px] text-ivory-faint">Assessment input · existing risk_score</span>{data && <SourceBadge source={data.source} />}</div>
              {loading ? <Skeleton className="mt-2 h-5 w-40" /> : a ? (
                <div className="mt-1">
                  <span className={clsx("font-display text-[22px] tnum", a.fraud_probability !== null && a.fraud_probability >= 0.85 ? "text-crimson" : "text-champagne")}>{a.fraud_probability?.toFixed(2) ?? "Not reported"}</span>
                  <span className="ml-2 text-[13px] text-ivory-dim">{PATTERN_LABEL[a.pattern]}, {inEpisode ? "part of the backend-reported episode" : "not in the backend-reported episode"}</span>
                </div>
              ) : <div className="mt-1 text-[13.5px] text-ivory-dim">Not assessed yet</div>}
            </div>
          </div>
        </div>

        <dl className="mt-8 grid border-t hairline sm:grid-cols-2 lg:grid-cols-3">
          {fields.map(([k, v, hot]) => (
            <div key={k} className="border-b hairline py-3.5 pr-6">
              <dt className="text-[12px] text-ivory-faint">{k}</dt>
              <dd className={clsx("mt-1 break-words text-[14px]", hot && "text-crimson")}>{v}</dd>
            </div>
          ))}
        </dl>
        {t.device && (
          <p className="mt-3 text-[12.5px] text-ivory-dim">Identity record: id_15 <b className="font-medium">{t.device.new_for_account ?? "–"}</b>, id_23 <b className="font-medium">{t.device.proxy ?? "no proxy"}</b>, {t.device.device_type ?? "unknown type"}.</p>
        )}
      </section>

      <div className="mt-5 grid gap-5 lg:grid-cols-3">
        <section className="sheet p-6">
          <h2 className="font-display text-[16px]">Evidence on this transaction</h2>
          {a ? (
            <ul className="mt-3 space-y-2.5">
              {a.evidence.filter((e) => e.entity_ids.includes(t.txn_id) || e.source === "customer").slice(0, 4).map((e, i) => (
                <li key={`${e.source}-${e.ref}-${i}`} className="text-[13px] leading-relaxed"><span className="mr-1.5 font-display text-[11px] text-champagne">{e.source}</span>{e.claim}</li>
              ))}
            </ul>
          ) : <p className="mt-3 text-[13.5px] text-ivory-dim">Evidence appears once the agent&rsquo;s answer file is loaded.</p>}
        </section>
        <section className="sheet p-6">
          <h2 className="font-display text-[16px]">Related transactions</h2>
          <p className="mt-1 text-[12.5px] text-ivory-faint">Same device profile, from identity.csv</p>
          {related.length === 0 ? <p className="mt-3 text-[13.5px] text-ivory-dim">None found{t.device ? "" : ": in-person transactions have no device record"}.</p> : (
            <ul className="mt-3 flex flex-wrap gap-1.5">{related.map((r) => <li key={r} className="rounded-md bg-slate px-2 py-0.5 font-display text-[12px] ring-1 ring-line">{r}</li>)}</ul>
          )}
        </section>
        <section className="sheet p-6">
          <h2 className="font-display text-[16px]">Related cases</h2>
          <ul className="mt-3 divide-y divide-line text-[13px]">
            <li className="py-2"><Link href={`/cases/${t.case_id}/`} className="font-display hover:text-champagne">{t.case_id}</Link> <span className="text-ivory-faint">this alert</span></li>
            {memory.map(({ closed: m }) => (
              <li key={m.case_id} className="py-2"><span className="font-display">{m.case_id}</span> <span className={m.outcome === "confirmed_fraud" ? "text-crimson" : "text-sage"}>{m.outcome === "confirmed_fraud" ? "confirmed fraud" : "cleared"}</span></li>
            ))}
          </ul>
        </section>
      </div>
    </>
  );
}
