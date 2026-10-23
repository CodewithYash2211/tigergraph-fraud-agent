"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { LAST_STAGE, STAGES } from "../data/stages";
import type { CaseStatus, Decision } from "../types";
import { DEFAULT_CASE_ID, getCase, runLiveInvestigation } from "../data/adapter";
import { getCachedLiveAnswer } from "../api/backend";
import type { LoadedAnswer } from "../data/types";

interface InvestigationState {
  stage: number;
  running: boolean;
  decision: Decision;
  rejectReason: string | null;
  decidedAt: string | null;
  sidebarCollapsed: boolean;
  caseId: string;
  verified: boolean;
  secured: boolean;
  authed: boolean;
  role: "analyst" | "customer" | null;
  /** the customer's answer to the verification request (simulated channel) */
  customerReply: "denied" | "confirmed" | null;
  answer: LoadedAnswer | null;
  investigationError: string | null;
}

interface InvestigationApi extends InvestigationState {
  status: CaseStatus;
  runInvestigation: (targetCaseId?: string, targetFlaggedTxnId?: string) => Promise<LoadedAnswer | null>;
  requestEvidence: () => void;
  decide: (d: Exclude<Decision, "pending">, reason?: string) => void;
  jumpTo: (stage: number) => void;
  reset: () => void;
  setSidebarCollapsed: (v: boolean) => void;
  openCase: (id: string) => void;
  hydrated: boolean;
  verify: () => void;
  secure: () => void;
  setRole: (r: "analyst" | "customer") => void;
  setCustomerReply: (r: "denied" | "confirmed") => void;
  signIn: () => void;
  signOut: () => void;
}

const initial: InvestigationState = {
  stage: 0,
  running: false,
  decision: "pending",
  rejectReason: null,
  decidedAt: null,
  sidebarCollapsed: false,
  caseId: DEFAULT_CASE_ID,
  verified: false,
  secured: false,
  authed: false,
  role: null,
  customerReply: null,
  answer: null,
  investigationError: null,
};

const KEY = "tg-investigation-v1";
const Ctx = createContext<InvestigationApi | null>(null);

export function InvestigationProvider({ children }: { children: ReactNode }) {
  const [s, setS] = useState<InvestigationState>(initial);
  const inFlight = useRef(false);
  const requestVersion = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const hydrated = useRef(false);
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = sessionStorage.getItem(KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        const cached = parsed.caseId ? getCachedLiveAnswer(parsed.caseId) : null;
        setS({
          ...initial,
          ...parsed,
          running: false,
          answer: cached || null,
        });
      } else {
        const cached = getCachedLiveAnswer(DEFAULT_CASE_ID);
        if (cached) {
          setS((p) => ({ ...p, answer: cached }));
        }
      }
    } catch {
      /* storage unavailable: start fresh */
    }
    hydrated.current = true;
    setIsHydrated(true);
  }, []);

  // Only restore previously validated live answers, never demo answer files.
  useEffect(() => {
    if (!hydrated.current || s.running) return;
    const cached = getCachedLiveAnswer(s.caseId);
    if (cached) {
      setS((p) => (p.answer !== cached ? { ...p, answer: cached } : p));
    }
  }, [s.caseId]);

  useEffect(() => {
    if (!hydrated.current) return;
    try {
      const toStore = { ...s, answer: null }; // do not bloat storage, answers stored in their own key
      sessionStorage.setItem(KEY, JSON.stringify(toStore));
    } catch {
      /* ignore */
    }
  }, [s]);

  const clear = () => {
    timers.current.forEach(clearTimeout);
    timers.current = [];
  };
  useEffect(() => clear, []);

  const schedule = (steps: { at: number; apply: (p: InvestigationState) => InvestigationState }[]) => {
    clear();
    steps.forEach(({ at, apply }) => timers.current.push(setTimeout(() => setS(apply), at)));
  };

  const runInvestigation = useCallback(
    async (customCaseId?: string, customTxnId?: string): Promise<LoadedAnswer | null> => {
      if (inFlight.current) return null;
      const version = ++requestVersion.current;
      const activeCaseId = customCaseId || s.caseId;
      const c = getCase(activeCaseId);
      const flaggedTxnId = customTxnId || c?.flagged_txn_id || "";

      if (!flaggedTxnId) {
        setS((p) => ({
          ...p,
          running: false,
          investigationError: `Flagged transaction ID not found for case ${activeCaseId}`,
        }));
        return null;
      }

      inFlight.current = true;
      // 1. Immediately start running animation and reset error
      setS((p) => ({
        ...p,
        running: true,
        caseId: activeCaseId,
        answer: null,
        decision: "pending",
        investigationError: null,
        stage: Math.min(p.stage, 1),
      }));

      // The backend does not stream intermediate progress, so keep the existing
      // stage steady until its real response arrives.
      try {
        const result = await runLiveInvestigation(activeCaseId, flaggedTxnId);
        if (version !== requestVersion.current) return null;
        clear();
        setS((p) => ({
          ...p,
          running: false,
          stage: 7,
          answer: result,
          investigationError: null,
        }));
        return result;
      } catch (err: any) {
        if (version !== requestVersion.current) return null;
        clear();
        const msg = err?.message || "Investigation failed on backend.";
        setS((p) => ({
          ...p,
          running: false,
          investigationError: msg,
          answer: null,
          stage: 0,
        }));
        return null;
      } finally {
        inFlight.current = false;
      }
    },
    [s.caseId, s.stage]
  );

  const requestEvidence = useCallback(() => {
    setS((p) => ({ ...p, stage: 5, running: true }));
    schedule([
      { at: 3200, apply: (p) => ({ ...p, stage: 6 }) },
      { at: 5200, apply: (p) => ({ ...p, stage: 7, running: false }) },
    ]);
  }, []);

  const decide = useCallback((d: Exclude<Decision, "pending">, reason?: string) => {
    clear();
    const now = new Date();
    setS((p) => ({
      ...p,
      stage: LAST_STAGE,
      running: false,
      decision: d,
      rejectReason: reason ?? null,
      decidedAt: now.toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit" }),
    }));
  }, []);

  const jumpTo = useCallback((stage: number) => {
    clear();
    setS((p) => ({
      ...p,
      stage,
      running: false,
      ...(stage < LAST_STAGE ? { decision: "pending" as Decision, rejectReason: null, decidedAt: null } : {}),
    }));
  }, []);

  const reset = useCallback(() => {
    requestVersion.current++;
    clear();
    setS((p) => ({
      ...initial,
      sidebarCollapsed: p.sidebarCollapsed,
      verified: p.verified,
      secured: p.secured,
      authed: p.authed,
      role: p.role,
    }));
  }, []);

  const setSidebarCollapsed = useCallback((v: boolean) => setS((p) => ({ ...p, sidebarCollapsed: v })), []);
  
  const openCase = useCallback((id: string) => {
    requestVersion.current++;
    clear();
    const cached = getCachedLiveAnswer(id);
    setS((p) => ({
      ...p,
      caseId: id,
      answer: cached || null,
      stage: cached ? 7 : 0,
      running: false,
      decision: "pending",
      rejectReason: null,
      decidedAt: null,
      investigationError: null,
    }));
  }, []);

  const verify = useCallback(() => setS((p) => ({ ...p, verified: true })), []);
  const secure = useCallback(() => setS((p) => ({ ...p, secured: true })), []);
  const setRole = useCallback((r: "analyst" | "customer") => setS((p) => ({ ...p, role: r })), []);
  const setCustomerReply = useCallback((r: "denied" | "confirmed") => setS((p) => ({ ...p, customerReply: r })), []);
  const signIn = useCallback(() => setS((p) => ({ ...p, authed: true, verified: true, secured: true })), []);
  const signOut = useCallback(() => setS((p) => ({ ...p, authed: false, verified: false, secured: false, role: null })), []);

  let status: CaseStatus = STAGES[s.stage].status;
  if (s.stage === LAST_STAGE)
    status = s.decision === "pending" ? "Awaiting approval" : s.decision === "review" ? "Awaiting approval" : "Complete";

  if (s.running) status = "Investigating";
  else if (s.answer?.answer.live && s.decision === "pending") {
    status = s.answer.answer.next_best_actions.final.some(a => a.route !== "auto") ? "Awaiting approval" : "Recommendation ready";
  }

  return (
    <Ctx.Provider
      value={{
        ...s,
        status,
        runInvestigation,
        requestEvidence,
        decide,
        jumpTo,
        reset,
        setSidebarCollapsed,
        openCase,
        hydrated: isHydrated,
        verify,
        secure,
        setRole,
        setCustomerReply,
        signIn,
        signOut,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export function useInvestigation() {
  const c = useContext(Ctx);
  if (!c) throw new Error("useInvestigation must be used inside InvestigationProvider");
  return c;
}

