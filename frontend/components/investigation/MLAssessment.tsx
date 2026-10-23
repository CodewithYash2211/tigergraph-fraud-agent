import type { AnswerFile } from "@/lib/data/types";

const scorePercentage = (value: number | null | undefined) =>
  value == null ? "Not reported" : `${(value * 100).toFixed(2)}%`;

export function MLAssessmentCard({ live, loading = false, failed = false }: {
  live?: AnswerFile["live"]; loading?: boolean; failed?: boolean;
}) {
  const ml = live?.ml_assessment;
  return (
    <section className="sheet mb-5 p-6 sm:p-8" aria-label="ML Fraud Assessment" aria-busy={loading}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-display text-[24px]">ML Fraud Assessment</h2>
        <span className="rounded-full bg-graphite/40 px-3 py-1 text-[12px] text-champagne ring-1 ring-ivory/[0.07]">Shadow mode</span>
      </div>
      <div className="mt-5" aria-live="polite">
        {loading ? <p role="status" className="text-ivory-dim">Loading ML assessment…</p>
          : failed ? <p role="alert" className="text-ivory-dim">ML assessment unavailable. Investigation request failed.</p>
          : !ml ? <p className="text-ivory-dim">No ML assessment data. Run an investigation to request a result.</p>
          : !ml.available ? <div className="text-ivory-dim"><p>ML assessment unavailable</p>{ml.error && <p role="alert" className="mt-2 text-[13px]">{ml.error}</p>}</div>
          : <dl className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {[
                ["XGBoost fraud score", scorePercentage(ml.fraudScore)],
                ["Model threshold", scorePercentage(ml.threshold)],
                ["Prediction", ml.prediction ?? "Not reported"],
                ["Model", ml.modelName ?? "Not reported"],
                ["Model version", ml.modelVersion ?? "Not reported"],
                ["Feature schema version", ml.featureSchemaVersion ?? "Not reported"],
              ].map(([label, value]) => <div key={label} className="min-w-0"><dt className="text-[12px] text-ivory-faint">{label}</dt><dd className="mt-1 break-words text-[17px] text-ivory tnum">{value}</dd></div>)}
            </dl>}
      </div>
      <div className="mt-5 border-t hairline pt-4 text-[14px]">
        <span className="text-ivory-faint">Existing risk_score: </span>
        <span className="tnum">{loading ? "Loading…" : failed ? "Not reported" : live?.dataset_risk_score == null ? "Not reported" : live.dataset_risk_score.toFixed(2)}</span>
      </div>
      <p className="mt-4 text-[13px] leading-relaxed text-ivory-dim">ML prediction is an additional investigation signal and does not independently determine the final policy action.</p>
    </section>
  );
}
