"use client";

import { useCallback, useEffect, useState } from "react";
import { getAllAnswers, getAnswer, runLiveInvestigation } from "./adapter";
import type { LoadedAnswer } from "./types";

export function useAnswer(caseId: string) {
  const [state, setState] = useState<{
    loading: boolean;
    data: LoadedAnswer | null;
    error: boolean;
    isInvestigating: boolean;
    investigationError: string | null;
  }>({
    loading: true,
    data: null,
    error: false,
    isInvestigating: false,
    investigationError: null,
  });

  const fetchAnswer = useCallback(() => {
    setState((prev) => ({ ...prev, loading: true, error: false }));
    getAnswer(caseId)
      .then((d) =>
        setState((prev) => ({
          ...prev,
          loading: false,
          data: d,
          error: false,
        }))
      )
      .catch(() =>
        setState((prev) => ({
          ...prev,
          loading: false,
          data: null,
          error: true,
        }))
      );
  }, [caseId]);

  useEffect(() => {
    fetchAnswer();
  }, [fetchAnswer]);

  const triggerInvestigation = useCallback(
    async (flaggedTxnId?: string) => {
      setState((prev) => ({
        ...prev,
        isInvestigating: true,
        investigationError: null,
      }));
      try {
        const result = await runLiveInvestigation(caseId, flaggedTxnId);
        setState((prev) => ({
          ...prev,
          isInvestigating: false,
          data: result,
          error: false,
          investigationError: null,
        }));
        return result;
      } catch (err: any) {
        const msg = err?.message || "Investigation failed on backend.";
        setState((prev) => ({
          ...prev,
          isInvestigating: false,
          investigationError: msg,
        }));
        return null;
      }
    },
    [caseId]
  );

  return {
    ...state,
    refetch: fetchAnswer,
    triggerInvestigation,
  };
}

export function useAllAnswers() {
  const [state, setState] = useState<{
    loading: boolean;
    data: Record<string, LoadedAnswer>;
  }>({ loading: true, data: {} });

  const fetchAll = useCallback(() => {
    getAllAnswers().then((d) => setState({ loading: false, data: d }));
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  return {
    ...state,
    refetch: fetchAll,
  };
}
