import type { EdgeView } from "@antv/x6";
import type { FlowchartPlaybackPatch, FlowchartRunChange, FlowchartRunState } from "@quirekit/flowchart";
import { readNode } from "../codec/read";
import type { FlowRuntime } from "../runtime/types";
import type { PlaybackTargetElement, RunOverlay } from "./types";
import { flowRuntimeText } from "../runtime/locale/messages";
import { runLabels, runSymbols } from "./symbols";

/** @param runtime - Exact graph, theme and document owner. @returns Sparse retained overlays and a frame-only dash phase port. */
export function createRunRenderer(runtime: FlowRuntime) {
  const { graph, mount } = runtime, document = mount.ownerDocument, ns = "http://www.w3.org/2000/svg";
  const overlays = new Map<string, RunOverlay>(), states = new Map<string, FlowchartRunState>(), flows = new Set<SVGPathElement>();
  let currentPhase = 0, presentation: "status" | "motion" = "status";
  const layer = document.createElementNS(ns, "g");
  layer.dataset.flowRunLayer = ""; layer.setAttribute("pointer-events", "none"); layer.setAttribute("aria-hidden", "true");
  graph.view.overlay.append(layer);
  /** @param state - Target state. @returns Current semantic projection without introducing a persistent color. */
  function color(state: FlowchartRunState): string {
    return runtime.appearance.runColors?.[state] ?? (state === "pending" ? runtime.appearance.line : state === "invalid" ? runtime.appearance.text : runtime.appearance.primary);
  }
  /** @param change - Exact target. @returns Prepared detached overlay, or undefined if the lifetime no longer contains it. */
  function prepare(change: FlowchartRunChange): RunOverlay | undefined {
    if (presentation === "motion") return;
    const cell = graph.getCellById(change.id), view = cell && graph.findViewByCell(cell); if (!view) return;
    const group = document.createElementNS(ns, "g"), path = document.createElementNS(ns, "path"), title = document.createElementNS(ns, "title");
    group.dataset.flowRunTarget = change.id; group.dataset.state = change.state;
    title.textContent = flowRuntimeText(runtime.locale, runLabels[change.state]); group.append(title, path);
    path.setAttribute("fill", "none"); path.setAttribute("stroke", color(change.state)); path.setAttribute("stroke-width", cell.isNode() ? "2.5" : "3");
    path.setAttribute("stroke-linecap", "round"); path.setAttribute("stroke-linejoin", "round"); path.setAttribute("vector-effect", "non-scaling-stroke");
    if (change.state === "pending" || change.state === "invalid") path.setAttribute("stroke-dasharray", "4 4");
    if (change.state === "reused") path.setAttribute("stroke-dasharray", "2 4");
    if (cell.isNode()) {
      const node = readNode(cell), body = view.findOne("body");
      group.setAttribute("transform", `translate(${node.x},${node.y}) rotate(${node.rotation ?? 0},${node.width / 2},${node.height / 2})`);
      path.setAttribute("d", body?.getAttribute("d") || `M0 0H${node.width}V${node.height}H0Z`);
      if (body?.hasAttribute("transform")) path.setAttribute("transform", body.getAttribute("transform")!);
      const badge = document.createElementNS(ns, "g"), backing = document.createElementNS(ns, "rect"), symbol = document.createElementNS(ns, "path");
      badge.setAttribute("transform", `translate(${node.width - 9},-10)`);
      for (const [key, value] of Object.entries({ x: "-3", y: "-3", width: "20", height: "20", rx: "4", fill: runtime.appearance.surface })) backing.setAttribute(key, value);
      symbol.setAttribute("d", runSymbols[change.state]); symbol.setAttribute("stroke", color(change.state)); symbol.setAttribute("stroke-width", "2");
      symbol.setAttribute("stroke-linecap", "round"); symbol.setAttribute("stroke-linejoin", "round"); symbol.setAttribute("fill", change.state === "running" ? color(change.state) : "none");
      badge.append(backing, symbol); group.append(badge); return { element: group };
    }
    path.setAttribute("d", (view as EdgeView).getConnectionPathData());
    if (change.state === "running") { path.dataset.flowRunEdge = cell.id; path.setAttribute("stroke-dasharray", "6 10"); return { element: group, flow: path }; }
    return { element: group };
  }
  /** @param patch - Sparse semantic changes. Reads mounted geometry before the batch of DOM writes. */
  function apply(patch: FlowchartPlaybackPatch): void {
    const previousPresentation = presentation;
    if (patch.reset) presentation = patch.motion?.presentation ?? "status";
    else if (patch.motion) presentation = patch.motion.presentation;
    if (!patch.reset && presentation !== previousPresentation) { for (const overlay of overlays.values()) overlay.element.remove(); overlays.clear(); flows.clear(); }
    const prepared = patch.changes.map(change => ({ change, overlay: prepare(change) }));
    if (patch.reset) { layer.replaceChildren(); overlays.clear(); states.clear(); flows.clear(); }
    for (const { change, overlay } of prepared) {
      const previous = overlays.get(change.id); previous?.element.remove(); if (previous?.flow) flows.delete(previous.flow);
      overlays.delete(change.id); states.set(change.id, change.state);
      if (overlay) { overlays.set(change.id, overlay); layer.append(overlay.element); if (overlay.flow) { flows.add(overlay.flow); overlay.flow.setAttribute("stroke-dashoffset", String(-16 * currentPhase)); } }
    }
  }
  return { apply,
    /** @param phase - Unit animation phase. Writes only running overlays, without geometry or model reads. */
    phase(phase: number): void { currentPhase = phase; for (const path of flows) path.setAttribute("stroke-dashoffset", String(-16 * phase)); },
    /** @returns Whether any current target needs continuous connector flow. */
    hasFlow: () => flows.size > 0,
    /** @returns Current target geometry for semantic scene-pose composition. */ targetElements: (): readonly PlaybackTargetElement[] => [...overlays].map(([id, overlay]) => ({ id, element: overlay.element })),
    /** Reprojects only previously addressed targets after a theme/locale change. */
    refresh(): void { apply({ reset: true, changes: [...states].map(([id, state]) => ({ id, state })), ...(presentation === "motion" ? { motion: { presentation, revealed: [], effects: [] } } : {}) }); },
    /** Clears all overlays before releasing the graph. */ destroy(): void { layer.remove(); overlays.clear(); states.clear(); flows.clear(); },
  };
}
