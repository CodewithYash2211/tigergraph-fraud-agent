"use client";

import { motion } from "motion/react";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { useInvestigation } from "@/lib/state/investigation";
import { getEvidenceForCase } from "@/lib/data/investigation-data";
import { EvidenceItem } from "@/components/investigation/StudioParts";
import { PageHeader, StatePanel } from "@/components/ui/primitives";
import type { EvidenceStrength } from "@/lib/types";

const STRENGTHS: ("all" | EvidenceStrength)[] = ["all", "strong", "contextual"];

export default function EvidencePage() {
  const { caseId, answer, stage } = useInvestigation();
  const [source, setSource] = useState<string>("All sources");
  const [strength, setStrength] = useState<"all" | EvidenceStrength>("all");

  const rawAnswer = answer?.answer;
  const evidenceList = rawAnswer ? getEvidenceForCase(caseId, rawAnswer) : [];
  const found = evidenceList.filter((e) => e.stage <= stage);
  const sources = ["All sources", "graph", "document", "customer"];

  return (
    <>
      <PageHeader
        title="Evidence"
        desc={rawAnswer
          ? `Evidence for ${caseId}: each claim, its source (graph, document, customer), the reference and the entity IDs it rests on.`
          : "Run a live investigation to see evidence from the backend."}
      />
      {found.length === 0 ? (
        <div className="sheet">
          <StatePanel
            kind="empty"
            title={rawAnswer ? "No evidence found" : "No evidence yet"}
            body={rawAnswer
              ? "The live investigation returned no evidence items."
              : "Evidence appears here after running a live investigation from the studio."}
            action={!rawAnswer ? { label: "Open studio", href: "/investigate" } : undefined}
          />
        </div>
      ) : (
        <div className="grid gap-5 lg:grid-cols-[220px_minmax(0,1fr)]">
          <aside className="space-y-6">
            <div>
              <div className="mb-2 text-[12px] text-ivory-faint">Source</div>
              <ul className="space-y-1">
                {sources.map((s) => (
                  <li key={s}>
                    <button
                      onClick={() => setSource(s)}
                      className={clsx(
                        "flex w-full items-center justify-between rounded-lg px-3 py-2 text-left text-[13.5px] capitalize transition-colors",
                        source === s ? "bg-ivory/[0.07] text-ivory" : "text-ivory-dim hover:text-ivory"
                      )}
                    >
                      {s}
                      <span className="text-[12px] text-ivory-faint tnum">
                        {s === "All sources" ? found.length : found.filter((e) => e.source === s).length}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
            <div>
              <div className="mb-2 text-[12px] text-ivory-faint">Strength</div>
              <div className="flex flex-wrap gap-2">
                {STRENGTHS.map((s) => (
                  <button
                    key={s}
                    onClick={() => setStrength(s)}
                    className={clsx(
                      "rounded-full px-3 py-1 text-[12.5px] capitalize ring-1",
                      strength === s
                        ? "bg-champagne/15 text-champagne ring-champagne/30"
                        : "text-ivory-dim ring-ivory/12"
                    )}
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </aside>

          <div className="space-y-5">
            <section className="sheet px-6 sm:px-8">
              {found.length === 0 ? (
                <StatePanel
                  kind="noresults"
                  title="Nothing with these filters"
                  body="Try another source or strength."
                  action={{ label: "Show all", onClick: () => { setSource("All sources"); setStrength("all"); } }}
                />
              ) : (
                <ul>
                  {found.map((ev, i) => (
                    <EvidenceItem key={ev.id} ev={ev} defaultOpen={i === 0} fresh />
                  ))}
                </ul>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}