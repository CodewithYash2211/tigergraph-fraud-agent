/** Normalize only the optional live response; no demo/model defaults. */
export interface MLAssessment {
  available: boolean;
  fraudScore: number | null;
  threshold: number | null;
  prediction: string | null;
  modelName: string | null;
  modelVersion: string | null;
  featureSchemaVersion: string | null;
  error: string | null;
}

export function validScore(value: unknown): number | null {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !value.trim()) return null;
  const score = Number(value);
  return Number.isFinite(score) && score >= 0 && score <= 1 ? score : null;
}

const safeIdentifier = (value: unknown): string | null =>
  typeof value === "string" && /^[a-zA-Z0-9_. -]{1,100}$/.test(value) ? value : null;

export function normalizeML(value: unknown): MLAssessment | undefined {
  if (!value || typeof value !== "object") return undefined;
  const raw = value as Record<string, unknown>;
  const fraudScore = validScore(raw.fraud_score);
  const threshold = validScore(raw.threshold);
  const errors: Record<string, string> = {
    artifact_missing: "Model artifact is unavailable.",
    artifact_or_identity_missing: "Model or identity data is unavailable.",
    environment_unavailable: "ML runtime is unavailable.",
    environment_mismatch: "ML runtime version mismatch.",
    schema_mismatch: "ML feature schema mismatch.",
    artifact_integrity_error: "Model integrity check failed.",
    malformed_transaction: "Transaction data could not be scored.",
    inference_timeout: "ML assessment timed out.",
  };
  const code = raw.error && typeof raw.error === "object"
    ? (raw.error as Record<string, unknown>).code : undefined;
  const error = raw.error ? (typeof code === "string" && Object.hasOwn(errors, code)
    ? errors[code] : "ML assessment could not be completed.") : null;
  const available = raw.available === true && fraudScore !== null && threshold !== null && !error;
  return {
    available, fraudScore: available ? fraudScore : null, threshold: available ? threshold : null,
    prediction: available && (raw.prediction === "fraud" || raw.prediction === "cleared") ? raw.prediction.toUpperCase() : null,
    modelName: safeIdentifier(raw.model_name), modelVersion: safeIdentifier(raw.model_version),
    featureSchemaVersion: safeIdentifier(raw.feature_schema_version),
    error: error || (raw.available === true && !available ? "ML response was incomplete or invalid." : null),
  };
}
