import { readFlowchart } from "@quirekit/flowchart";
import type { FlowchartColorTarget } from "../../types";
import { readGraph } from "../../codec/read";
import type { FlowRuntime } from "../types";

/** @param runtime - Writable instance after its command guard. @param target - Independent style property. @param color - Explicit opaque HEX color. */
export function setSelectionColor(runtime: FlowRuntime, target: FlowchartColorTarget, color: string): void {
  if (!["fill", "stroke", "color"].includes(target)) throw new TypeError("未知颜色属性");
  if (!/^#[\da-fA-F]{6}$/u.test(color)) throw new TypeError("颜色必须为六位 HEX");
  const { graph } = runtime, selected = new Set(graph.getSelectedCells().map(cell => cell.id));
  if (!selected.size) return;
  // An explicit command validates the complete reference graph once before any
  // mutation. Mixed node/edge outlines share one authoritative history batch.
  const source = readGraph(graph, 0);
  const checked = readFlowchart({ ...source,
    nodes: source.nodes.map(node => selected.has(node.id) ? { ...node, style: { ...node.style, [target]: color } } : node),
    edges: source.edges.map(edge => target === "stroke" && selected.has(edge.id) ? { ...edge, style: { ...edge.style, stroke: color } } : edge) });
  const updates = [...checked.nodes.filter(node => selected.has(node.id)), ...checked.edges.filter(edge => target === "stroke" && selected.has(edge.id))];
  graph.batchUpdate("color", () => updates.forEach(value => {
    const cell = graph.getCellById(value.id), old = cell.getData<{ source: typeof value }>().source;
    const previous = (old.style as Record<string, unknown>)[target];
    if (typeof previous !== "string" || previous.toLowerCase() !== color.toLowerCase()) cell.setData({ source: value }, { overwrite: true });
  }));
}
