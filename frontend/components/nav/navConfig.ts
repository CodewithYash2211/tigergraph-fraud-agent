import {
  Activity, BookOpenText, CheckCheck, Clapperboard, FileSearch, FolderClock, Gauge, GitCompareArrows,
  LayoutDashboard, Layers3, Network, ShieldCheck, SplitSquareHorizontal, Waypoints, type LucideIcon,
} from "lucide-react";

export interface NavItem {
  href: string;
  label: string;
  desc: string;
  icon: LucideIcon;
  /** investigation stage at which this step is reached (marks progress in the sidebar) */
  stage?: number;
  doneAt?: number;
}

export interface NavGroup {
  key: string;
  label: string;
  items: NavItem[];
}

/** Workspace-level navigation (sidebar). */
export const GROUPS: NavGroup[] = [
  {
    key: "overview", label: "Overview",
    items: [
      { href: "/overview", label: "Dashboard", desc: "Your queue at a glance", icon: LayoutDashboard },
      { href: "/investigate", label: "Investigation Studio", desc: "Graph and evidence", icon: Waypoints, stage: 0, doneAt: 3 },
      { href: "/cases", label: "Cases", desc: "Open and recent cases", icon: Layers3 },
    ],
  },
  {
    key: "investigation", label: "Investigation",
    items: [
      { href: "/intelligence", label: "Graph", desc: "Entities and relationships", icon: Network },
      { href: "/intelligence/evidence", label: "Evidence", desc: "Everything the agent found", icon: FileSearch },
      { href: "/intelligence/patterns", label: "Fraud patterns", desc: "Known and emerging", icon: GitCompareArrows },
      { href: "/intelligence/agent", label: "Agent activity", desc: "Tool calls and reasoning", icon: Activity },
      { href: "/cases/memory", label: "Case memory", desc: "Past outcomes", icon: FolderClock },
      { href: "/intelligence/policy", label: "Policy", desc: "What the agent may do alone", icon: BookOpenText },
    ],
  },
  {
    key: "decision", label: "Decision",
    items: [
      { href: "/investigate/assessment", label: "Risk", desc: "Score, confidence, uncertainty", icon: Gauge, stage: 3, doneAt: 7 },
      { href: "/investigate/decision", label: "Recommendations", desc: "Next best action", icon: ShieldCheck, stage: 4, doneAt: 99 },
      { href: "/approvals", label: "Approvals", desc: "Waiting for a human", icon: CheckCheck },
    ],
  },
  {
    key: "replay", label: "Replay",
    items: [
      { href: "/replay", label: "Investigation Replay", desc: "Watch it unfold again", icon: Clapperboard },
      { href: "/replay/before-after", label: "Before / after", desc: "One signal vs the picture", icon: SplitSquareHorizontal },
    ],
  },
];

/** Product-level navigation (top bar). */
export const SECTIONS = [
  { key: "product", label: "Product", href: "/#problem", match: [] as string[] },
  { key: "investigate", label: "Investigations", href: "/overview", match: ["/overview", "/investigate", "/approvals"] },
  { key: "cases", label: "Cases", href: "/cases", match: ["/cases", "/transactions"] },
  { key: "intelligence", label: "Intelligence", href: "/intelligence", match: ["/intelligence"] },
  { key: "replay", label: "Replay", href: "/replay", match: ["/replay"] },
];

export function clean(pathname: string) {
  return pathname.replace(/\/$/, "") || "/";
}

export function sectionKey(pathname: string) {
  const p = clean(pathname);
  if (p === "/cases/memory") return "intelligence";
  return SECTIONS.find((s) => s.match.some((m) => p === m || p.startsWith(m + "/")))?.key ?? null;
}

export const ALL_ITEMS = GROUPS.flatMap((g) => g.items);
