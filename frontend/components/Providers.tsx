"use client";
import { MotionConfig } from "motion/react";
import { InvestigationProvider } from "@/lib/state/investigation";
import { CommandPalette } from "@/components/CommandPalette";

import { CustomerProvider } from "@/lib/state/customer";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <MotionConfig reducedMotion="user" transition={{ ease: [0.22, 1, 0.36, 1], duration: 0.5 }}>
      <InvestigationProvider>
        <CustomerProvider>
          <CommandPalette />
          {children}
        </CustomerProvider>
      </InvestigationProvider>
    </MotionConfig>
  );
}
