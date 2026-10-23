/**
 * Data adapters. Every screen reads through these functions, never from fixtures directly,
 * so they can be swapped for TigerGraph / API calls later without touching components.
 *
 * Sources today:
 *  - fixtures/case_pack.json        built from case_pack.csv + identity.csv (scripts/build_fixtures.py)
 *  - fixtures/closed_cases.json     the closed cases relevant to the 20 exam cases (+ all undocumented ones)
 *  - public/data/cases/<id>.json    the agent's answer files, loaded at runtime
 *  - POST /api/investigate          live backend investigations, cached per session
 *
 * Cases without an agent answer file or live result return null; the UI shows
 * an honest "awaiting agent output" state. There is no demo fallback.
 */
import casePack from "./fixtures/case_pack.json";
import closedCases from "./fixtures/closed_cases.json";
import stats from "./fixtures/closed_case_stats.json";
import type { AnswerFile, CasePackCase, ClosedCase, LoadedAnswer } from "./types";

const CASES = casePack as unknown as CasePackCase[];
const CLOSED = closedCases as unknown as ClosedCase[];

/** Default case shown on first load: the first case in the case pack. */
export const DEFAULT_CASE_ID = CASES[0]?.case_id ?? "";

export function getCasePack(): CasePackCase[] {
  return CASES;
}
export function getCase(caseId: string): CasePackCase | undefined {
  return CASES.find((c) => c.case_id === caseId);
}
export function getClosedCases(): ClosedCase[] {
  return CLOSED;
}
export function getClosedCase(id: string): ClosedCase | undefined {
  return CLOSED.find((c) => c.case_id === id);
}
export function getClosedCaseStats() {
  return stats as { total: number; by_outcome: Record<string, number>; by_pattern: Record<string, number>; identity_records: number };
}

/** Closed cases the investigation can use as memory: same customer, same device profile, or cited by the answer. */
export function getSimilarCases(caseId: string, answer?: AnswerFile | null): { closed: ClosedCase; why: string }[] {
  const c = getCase(caseId);
  if (!c) return [];
  const out = new Map<string, { closed: ClosedCase; why: string }>();
  for (const id of answer?.case.similar_prior_cases ?? []) {
    const cc = getClosedCase(id);
    if (cc) out.set(id, { closed: cc, why: "Cited by the investigation" });
  }
  for (const id of c.device_closed_cases) {
    const cc = getClosedCase(id);
    if (cc && !out.has(id)) out.set(id, { closed: cc, why: "Same device profile as the flagged transaction" });
  }
  for (const id of c.customer_closed_cases) {
    const cc = getClosedCase(id);
    if (cc && !out.has(id)) out.set(id, { closed: cc, why: "Earlier case on the same customer" });
  }
  return [...out.values()];
}

export interface TransactionView {
  txn_id: string;
  case_id: string;
  card_id: string;
  customer_id: string;
  amount_usd: number | null;
  timestamp: string | null; // exact ts lives in transactions.csv; alert time shown instead
  alert_time: string;
  channel: "online" | "in_person" | null;
  product: string | null;
  risk_score: number | null;
  billing_region: string | null;
  email_domain: string | null;
  device: CasePackCase["device"];
}

/** The frontend knows the 20 flagged transactions. Everything else would come from TigerGraph. */
export function getTransaction(txnId: string): TransactionView | undefined {
  const c = CASES.find((x) => x.flagged_txn_id === txnId);
  if (!c) return undefined;
  return {
    txn_id: c.flagged_txn_id, case_id: c.case_id, card_id: c.card_id, customer_id: c.customer_id,
    amount_usd: c.amount_usd, timestamp: null, alert_time: c.opened_at, channel: c.channel,
    product: c.channel === "in_person" ? "W" : null, risk_score: c.risk_score, billing_region: c.billing_region,
    email_domain: null, device: c.device,
  };
}
export function getTransactionsByCard(cardId: string): TransactionView[] {
  return CASES.filter((c) => c.card_id === cardId).map((c) => getTransaction(c.flagged_txn_id)!);
}
export function getTransactionsByCustomer(customerId: string): TransactionView[] {
  return CASES.filter((c) => c.customer_id === customerId).map((c) => getTransaction(c.flagged_txn_id)!);
}
/** Other transactions that share the flagged transaction's device profile (from identity.csv). */
export function getRelatedTransactions(txnId: string): string[] {
  return CASES.find((c) => c.flagged_txn_id === txnId)?.device_neighbours_exam_window ?? [];
}
export function getDeviceConnections(profile: string) {
  const cases = CASES.filter((c) => c.device?.profile === profile);
  return {
    profile,
    identity_records: cases[0]?.device_neighbour_count ?? 0,
    closed_cases: [...new Set(cases.flatMap((c) => c.device_closed_cases))],
    exam_cases: cases.map((c) => c.case_id),
  };
}

import {
  getCachedLiveAnswer,
  setCachedLiveAnswer,
  triggerBackendInvestigation,
} from "@/lib/api/backend";

/* ------------------------------------------------------------ answers (runtime) */

let manifest: Promise<string[]> | null = null;
const cache = new Map<string, Promise<LoadedAnswer | null>>();

function loadManifest() {
  manifest ??= fetch("/data/cases/index.json")
    .then((r) => (r.ok ? r.json() : { answers: [] }))
    .then((j: { answers?: string[] }) => j.answers ?? [])
    .catch(() => []);
  return manifest;
}

export function getAnswer(caseId: string): Promise<LoadedAnswer | null> {
  const live = getCachedLiveAnswer(caseId);
  if (live) return Promise.resolve(live);

  if (!cache.has(caseId)) {
    cache.set(caseId, loadManifest().then(async (ids) => {
      // Re-check live cache in case it was set while waiting
      const currentLive = getCachedLiveAnswer(caseId);
      if (currentLive) return currentLive;

      if (ids.includes(caseId)) {
        try {
          const r = await fetch(`/data/cases/${caseId}.json`);
          if (r.ok) return { answer: (await r.json()) as AnswerFile, source: "agent" as const };
        } catch { /* fall through */ }
      }
      return null;
    }));
  }
  return cache.get(caseId)!;
}

export async function runLiveInvestigation(
  caseId: string,
  flaggedTxnId?: string
): Promise<LoadedAnswer> {
  let txnId = flaggedTxnId;
  if (!txnId) {
    const c = getCase(caseId);
    txnId = c?.flagged_txn_id || "";
  }

  if (!txnId) {
    throw new Error(`Flagged transaction ID not found for case ${caseId}`);
  }

  const result = await triggerBackendInvestigation(caseId, txnId);
  cache.set(caseId, Promise.resolve(result));
  return result;
}

export async function getAllAnswers(): Promise<Record<string, LoadedAnswer>> {
  const entries = await Promise.all(CASES.map(async (c) => [c.case_id, await getAnswer(c.case_id)] as const));
  return Object.fromEntries(entries.filter(([, a]) => a)) as Record<string, LoadedAnswer>;
}

