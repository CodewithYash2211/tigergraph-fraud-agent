"use client";

import {
  BaseEdge, Controls, EdgeLabelRenderer, Handle, Position, ReactFlow, ReactFlowProvider,
  useInternalNode, useReactFlow, useStore, type Edge, type EdgeProps, type Node, type NodeProps,
} from "@xyflow/react";
import { motion } from "motion/react";
import { memo, useEffect, useMemo } from "react";
import clsx from "clsx";
import { AtSign, Building2, FolderLock, MapPin, Smartphone } from "lucide-react";
import type { EntityKind, GraphEntity, GraphRelation } from "@/lib/types";

type NodeData = {
  e: GraphEntity;
  alarm: boolean; // show suspicious emphasis
  selected: boolean;
  dim: boolean;
  compact: boolean;
};
type EdgeData = { suspicious: boolean; dim: boolean; active: boolean; label: string; alarm: boolean };

const CRIMSON = "#E25564";
const CYAN = "#C9A86A";
const EDGE_VIOLET = "#9B87F5";

const handles = (
  <>
    <Handle type="target" position={Position.Left} />
    <Handle type="source" position={Position.Right} />
  </>
);

function Label({ e, alarm }: { e: GraphEntity; alarm: boolean }) {
  return (
    <div className="pointer-events-none absolute left-1/2 top-full mt-2 w-max max-w-[260px] -translate-x-1/2 rounded-lg border border-ivory/10 bg-[#0b1220]/95 px-2.5 py-1.5 text-center shadow-lg">
      {e.kind !== "transaction" && <div className="break-all text-[15px] font-semibold leading-snug text-ivory">{e.label}</div>}
      {e.sub && <div className={clsx("mt-0.5 break-words text-[14px] leading-snug", alarm && e.flagged ? "text-crimson" : "text-ivory-dim")}>{e.sub}</div>}
    </div>
  );
}

const EntityNode = memo(function EntityNode({ data }: NodeProps<Node<NodeData>>) {
  const { e, alarm, selected, dim, compact } = data;
  const ring = alarm ? "ring-crimson/70" : e.kind === "transaction" ? "ring-champagne/60" : "ring-ivory/25";
  const flaggedRing = e.flagged && e.kind === "transaction" ? "ring-2 ring-crimson/80" : "";
  const glow = alarm ? "shadow-[0_0_0_6px_rgba(226,85,100,0.1),0_0_30px_rgba(226,85,100,0.25)]" : "";
  const sel = selected ? "outline outline-2 outline-offset-4 outline-violet-300" : "";

  let body: React.ReactNode;
  if (e.kind === "transaction") {
    body = (
      <div className={clsx("flex flex-col justify-center border-2 ring-1 transition-[box-shadow,outline,transform,border-color] duration-300", e.flagged ? "min-h-[92px] min-w-[232px] rounded-2xl px-5 py-4 border-crimson/75 bg-[#211b2a] ring-crimson/70" : "min-h-[68px] min-w-[200px] rounded-xl px-4 py-3 border-champagne/45 bg-[#192438] ring-champagne/40", flaggedRing, glow, sel, selected && "scale-[1.04] shadow-[0_0_0_1px_rgba(196,181,253,0.4),0_16px_40px_rgba(124,92,255,0.2)]")}>
        <span className={clsx("whitespace-nowrap font-semibold tracking-tight tnum text-ivory", e.flagged ? "text-[19px]" : "text-[16px]")}>{e.label}</span>
        {e.flagged && <span className="mt-1 block text-[12px] font-semibold uppercase tracking-[0.09em] text-crimson">Flagged transaction</span>}
      </div>
    );
  } else if (e.kind === "customer") {
    const initials = e.label.split(" ").map((w) => w[0]).join("").slice(0, 2);
    body = (
      <div className={clsx("grid h-[80px] w-[80px] place-items-center rounded-full border border-violet-300/40 bg-violet-400/15 ring-1 transition-shadow duration-300", ring, glow, sel)}>
        <span className="font-display text-[22px] font-semibold text-violet-100">{initials}</span>
      </div>
    );
  } else if (e.kind === "account") {
    body = (
      <div className={clsx("relative h-[64px] w-[96px] rounded-xl border border-champagne/40 bg-[#252438] ring-1 transition-shadow duration-300", ring, glow, sel)}>
        <span className="absolute left-2 top-2 h-2 w-3 rounded-[2px] bg-champagne/70" />
        <span className="absolute bottom-2 left-2 right-2 h-px bg-ivory/20" />
      </div>
    );
  } else if (e.kind === "device") {
    body = (
      <div className={clsx("grid h-[76px] w-[60px] place-items-center rounded-xl border border-sky-300/30 bg-sky-300/10 ring-1 transition-shadow duration-300", ring, glow, sel)}>
        <Smartphone size={19} strokeWidth={1.5} className={alarm ? "text-crimson" : "text-ivory-dim"} />
      </div>
    );
  } else if (e.kind === "merchant") {
    body = (
      <div className={clsx("grid h-[72px] w-[72px] place-items-center rounded-2xl border border-champagne/35 bg-champagne/10 ring-1 transition-shadow duration-300", alarm ? ring : "ring-champagne/45", glow, sel)}>
        <Building2 size={19} strokeWidth={1.5} className="text-champagne" />
      </div>
    );
  } else if (e.kind === "location") {
    body = (
      <div className={clsx("grid h-[72px] w-[72px] place-items-center rounded-full border border-emerald-300/30 bg-emerald-300/10 ring-1 transition-shadow duration-300", ring, glow, sel)}>
        <MapPin size={19} strokeWidth={1.5} className={alarm ? "text-crimson" : "text-ivory-dim"} />
      </div>
    );
  } else if (e.kind === "email") {
    body = (
      <div className={clsx("grid h-[72px] w-[72px] place-items-center rounded-full border border-fuchsia-300/30 bg-fuchsia-300/10 ring-1 transition-shadow duration-300", ring, glow, sel)}>
        <AtSign size={19} strokeWidth={1.5} className={alarm ? "text-crimson" : "text-ivory-dim"} />
      </div>
    );
  } else {
    body = (
      <div className={clsx("grid h-[72px] w-[72px] place-items-center rounded-full border border-dashed bg-[#192438] transition-shadow duration-300", alarm ? "border-crimson" : "border-ivory/40", glow, sel)}>
        <FolderLock size={19} strokeWidth={1.5} className={alarm ? "text-crimson" : "text-ivory-dim"} />
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.4 }}
      animate={{ opacity: dim ? 0.28 : 1, scale: 1 }}
      transition={{ type: "spring", stiffness: 260, damping: 22 }}
      className="relative cursor-pointer"
    >
      {handles}
      {body}
      {!compact && <Label e={e} alarm={alarm} />}
    </motion.div>
  );
});

function center(n: ReturnType<typeof useInternalNode>) {
  if (!n) return null;
  return {
    x: n.internals.positionAbsolute.x + (n.measured.width ?? 0) / 2,
    y: n.internals.positionAbsolute.y + (n.measured.height ?? 0) / 2,
  };
}

/** Floating edge: a gentle arc between node centres, independent of handle side. */
function ThreadEdge({ id, source, target, data }: EdgeProps<Edge<EdgeData>>) {
  const a = center(useInternalNode(source));
  const b = center(useInternalNode(target));
  if (!a || !b) return null;
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const mx = (a.x + b.x) / 2 - dy * 0.12;
  const my = (a.y + b.y) / 2 + dx * 0.12;
  const path = `M ${a.x} ${a.y} Q ${mx} ${my} ${b.x} ${b.y}`;
  const lx = (a.x + 2 * mx + b.x) / 4;
  const ly = (a.y + 2 * my + b.y) / 4;
  const d = data!;
  const hot = d.suspicious && d.alarm;
  return (
    <>
      <BaseEdge id={`${id}-base`} path={path} style={{ stroke: "transparent", strokeWidth: 12 }} />
      <motion.path
        d={path}
        fill="none"
        initial={{ pathLength: 0, stroke: CYAN, opacity: 0 }}
        animate={{
          pathLength: 1,
          opacity: d.dim ? 0.12 : hot ? 0.98 : d.active ? 0.92 : 0.72,
          stroke: hot ? CRIMSON : d.suspicious ? CYAN : EDGE_VIOLET,
        }}
        transition={{
          pathLength: { duration: 0.9, ease: [0.22, 1, 0.36, 1] },
          stroke: { delay: hot ? 0.9 : 0, duration: 0.8 },
          opacity: { duration: 0.5 },
        }}
        strokeWidth={hot ? 2.8 : d.active ? 2.6 : 2}
      />
      {hot && !d.dim && (
        <motion.path
          d={path}
          fill="none"
          stroke="#E86B7A"
          strokeWidth={1.2}
          strokeDasharray="2 22"
          className="edge-flow"
          initial={{ opacity: 0 }}
          animate={{ opacity: 0.8 }}
          transition={{ delay: 1.6 }}
        />
      )}
      {d.active && (
        <EdgeLabelRenderer>
          <div
            className="pointer-events-none absolute rounded-full border border-violet-300/25 bg-[#0b1220]/98 px-3 py-1.5 text-[13px] font-semibold tracking-wide text-ivory shadow-lg shadow-black/30"
            style={{ transform: `translate(-50%, -50%) translate(${lx}px, ${ly}px)` }}
          >
            {d.label}
          </div>
        </EdgeLabelRenderer>
      )}
    </>
  );
}

const nodeTypes = { entity: EntityNode };
const edgeTypes = { thread: ThreadEdge };

export interface GraphProps {
  stage: number;
  selectedId?: string | null;
  onSelect?: (id: string | null) => void;
  highlight?: string[] | null;
  kinds?: EntityKind[];
  suspiciousOnly?: boolean;
  interactive?: boolean;
  compact?: boolean;
  /** the stage from which suspicious emphasis appears */
  alarmFrom?: number;
  /** restrict to these entity ids (relationship expansion) */
  only?: Set<string> | null;
  showControls?: boolean;
  entities?: GraphEntity[];
  relations?: GraphRelation[];
}

function Camera({ layoutKey, padding }: { layoutKey: string; padding: number }) {
  const { fitView } = useReactFlow();
  const w = useStore((s) => s.width);
  const h = useStore((s) => s.height);
  useEffect(() => {
    const t = setTimeout(() => fitView({ duration: 650, padding, maxZoom: 1.65 }), 80);
    return () => clearTimeout(t);
  }, [layoutKey, fitView, padding]);
  useEffect(() => {
    if (!w || !h) return;
    const t = setTimeout(() => fitView({ padding, maxZoom: 1.65 }), 120);
    return () => clearTimeout(t);
  }, [w, h, fitView, padding]);
  return null;
}

function GraphInner({
  stage,
  selectedId = null,
  onSelect,
  highlight,
  kinds,
  suspiciousOnly,
  interactive = true,
  compact = false,
  alarmFrom = 1,
  only = null,
  showControls = false,
  entities: customEntities,
  relations: customRelations,
}: GraphProps) {
const sourceEntities = customEntities || [];
const sourceRelations = customRelations || [];

  const { nodes, edges } = useMemo(() => {
    const visible = sourceEntities.filter(
      (e) => e.stage <= stage && (!kinds || kinds.includes(e.kind)) && (!only || only.has(e.id))
    );
    const ids = new Set(visible.map((v) => v.id));
    const rels = sourceRelations.filter(
      (r) => r.stage <= stage && ids.has(r.source) && ids.has(r.target) && (!suspiciousOnly || r.suspicious)
    );
    const focus = new Set<string>();
    if (selectedId) {
      focus.add(selectedId);
      rels.forEach((r) => {
        if (r.source === selectedId) focus.add(r.target);
        if (r.target === selectedId) focus.add(r.source);
      });
    } else if (highlight?.length) highlight.forEach((h) => focus.add(h));
    const shownIds = suspiciousOnly ? new Set(rels.flatMap((r) => [r.source, r.target])) : ids;
    const alarm = stage >= alarmFrom;

    const nodes: Node<NodeData>[] = visible
      .filter((e) => shownIds.has(e.id))
      .map((e) => ({
        id: e.id,
        type: "entity",
        position: { x: e.x, y: e.y },
        data: { e, alarm: alarm && !!e.flagged, selected: e.id === selectedId, dim: focus.size > 0 && !focus.has(e.id), compact },
        draggable: interactive,
        selectable: interactive,
      }));
    const edges: Edge<EdgeData>[] = rels.map((r) => ({
      id: r.id,
      source: r.source,
      target: r.target,
      type: "thread",
      data: {
        suspicious: !!r.suspicious,
        alarm,
        label: r.label,
        dim: focus.size > 0 && !(focus.has(r.source) && focus.has(r.target)),
        active: !!selectedId && (r.source === selectedId || r.target === selectedId),
      },
    }));
    return { nodes, edges };
  }, [stage, selectedId, highlight, kinds, suspiciousOnly, interactive, compact, alarmFrom, only, sourceEntities, sourceRelations]);
  const layoutKey = nodes.map((node) => `${node.id}:${node.position.x},${node.position.y}`).join("|");

  return (
    <ReactFlow
      nodes={nodes}
      edges={edges}
      nodeTypes={nodeTypes}
      edgeTypes={edgeTypes}
      fitView
      fitViewOptions={{ padding: compact ? 0.12 : 0.14, maxZoom: 1.65 }}
      minZoom={0.3}
      maxZoom={2}
      onNodeClick={(_, n) => onSelect?.(n.id === selectedId ? null : n.id)}
      onPaneClick={() => onSelect?.(null)}
      panOnDrag={interactive}
      zoomOnScroll={false}
      zoomOnPinch={interactive}
      zoomOnDoubleClick={interactive}
      nodesConnectable={false}
      elementsSelectable={interactive}
      proOptions={{ hideAttribution: true }}
      aria-label="Investigation graph"
    >
      <Camera layoutKey={layoutKey} padding={compact ? 0.12 : 0.14} />
      {showControls && <Controls showInteractive={false} position="bottom-right" />}
    </ReactFlow>
  );
}

export function InvestigationGraph(props: GraphProps) {
  return (
    <ReactFlowProvider>
      <GraphInner {...props} />
    </ReactFlowProvider>
  );
}

export function GraphLegend() {
  const items: { label: string; el: React.ReactNode }[] = [
    { label: "Customer", el: <span className="h-3 w-3 rounded-full ring-1 ring-ivory/40" /> },
    { label: "Card", el: <span className="h-2.5 w-4 rounded-[3px] ring-1 ring-ivory/40" /> },
    { label: "Device", el: <span className="h-3.5 w-2.5 rounded-[3px] ring-1 ring-ivory/40" /> },
    { label: "Email entity", el: <AtSign size={13} /> },
    { label: "Region", el: <MapPin size={13} /> },
    { label: "Transaction", el: <span className="h-2.5 w-5 rounded-full ring-1 ring-champagne/60" /> },
    { label: "Closed case", el: <span className="h-3 w-3 rounded-full border border-dashed border-ivory/50" /> },
    { label: "Suspicious link", el: <span className="h-px w-5 bg-crimson" /> },
  ];
  return (
    <ul className="flex flex-wrap items-center gap-x-4 gap-y-2 text-[12px] text-ivory-faint">
      {items.map((i) => (
        <li key={i.label} className="flex items-center gap-2">
          {i.el}
          {i.label}
        </li>
      ))}
    </ul>
  );
}
