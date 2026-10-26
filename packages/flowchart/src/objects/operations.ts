import { flowchartNodeBounds } from "../transform/geometry";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { readFlowchart } from "../model/document";
import { selectedRoots } from "../arrange/selection";
import { isSequenceParticipant, isFlowchartContainer } from "../structure/hierarchy";
import { assertFlowchartUnlocked, objectMembers } from "./selection";
import type { FlowchartLayer } from "./types";

/** @param document - Canonical graph. @param ids - Sibling roots. @param id - Fresh group identity. @returns New ownership without moving world geometry. */
export function groupFlowchart(document: FlowchartDocument, ids: readonly string[], id: string): FlowchartDocument {
  const source = readFlowchart(document), roots = selectedRoots(source, ids);
  assertFlowchartUnlocked(source, ids);
  if (roots.length < 2 || roots.some(n => n.parent !== roots[0]!.parent)) throw new Error("请选中同一容器内至少两个图形");
  if (roots.some(n => isSequenceParticipant(n.shape) || /^(lane-|phase-|sequence-)/.test(n.shape) || ["activation", "destruction"].includes(n.shape))) throw new Error("结构图形请使用专用结构工具");
  const bounds = roots.map(flowchartNodeBounds);
  const x = Math.min(...bounds.map(n => n.x)) - 8, y = Math.min(...bounds.map(n => n.y)) - 8;
  const group: FlowchartNode = { id, shape: "group", x, y, width: Math.max(...bounds.map(n => n.x + n.width)) - x + 8,
    height: Math.max(...bounds.map(n => n.y + n.height)) - y + 8, text: "", style: {}, ...(roots[0]!.parent ? { parent: roots[0]!.parent } : {}) };
  const selected = new Set(roots.map(n => n.id));
  return readFlowchart({ ...source, nodes: [...source.nodes.map(n => selected.has(n.id) ? { ...n, parent: id } : n), group] });
}
/** @param document - Canonical graph. @param ids - Groups to release one level. @returns Children assigned to the previous outer owner with their world geometry unchanged. */
export function ungroupFlowchart(document: FlowchartDocument, ids: readonly string[]): FlowchartDocument {
  const source = readFlowchart(document), groups = new Map(selectedRoots(source, ids).filter(n => n.shape === "group").map(n => [n.id, n]));
  assertFlowchartUnlocked(source, ids);
  if (!groups.size) throw new Error("请先选择组合");
  const nodes = source.nodes.filter(n => !groups.has(n.id)).map(n => {
    if (!n.parent || !groups.has(n.parent)) return n;
    const { parent, ...content } = n, owner = groups.get(parent)!.parent;
    return { ...content, ...(owner ? { parent: owner } : {}) };
  });
  return readFlowchart({ ...source, nodes });
}
/** @param document - Canonical graph. @param ids - Direct targets. @param locked - New lock. @param all - Whether to clear every nested lock. @returns Persisted permissions without modifying geometry. */
export function lockFlowchart(document: FlowchartDocument, ids: readonly string[], locked: boolean, all = false): FlowchartDocument {
  const source = readFlowchart(document), selected = new Set(ids);
  /** @param cell - Shape or connection. @returns Explicit lock or omitted default. */
  function update<T extends { readonly id: string; readonly locked?: boolean }>(cell: T): T {
    if (!all && !selected.has(cell.id)) return cell;
    const { locked: _locked, ...rest } = cell;
    return (locked ? { ...cell, locked: true } : rest) as T;
  }
  return readFlowchart({ ...source, nodes: source.nodes.map(update), edges: source.edges.map(update) });
}
/** @param document - Canonical graph. @param ids - Objects and subtrees. @param layer - Stable ordering intent. @returns Array order shared by every adapter. */
export function orderFlowchart(document: FlowchartDocument, ids: readonly string[], layer: FlowchartLayer): FlowchartDocument {
  const source = readFlowchart(document), selected = objectMembers(source, ids);
  assertFlowchartUnlocked(source, ids);
  if (!["front", "back", "forward", "backward"].includes(layer)) throw new TypeError("未知层级");
  /** @param cells - One paint plane. @returns Stable ordering, moving a selected block at most one neighbor for step commands. */
  function order<T extends { readonly id: string }>(cells: readonly T[]): T[] {
    /** @param cell - Candidate object. @returns Whether it belongs to the selected subtree. */
    const active = (cell: T) => selected.has(cell.id);
    if (layer === "front") return [...cells.filter(c => !active(c)), ...cells.filter(active)];
    if (layer === "back") return [...cells.filter(active), ...cells.filter(c => !active(c))];
    const result = [...cells], forward = layer === "forward", step = forward ? -1 : 1;
    for (let i = forward ? result.length - 2 : 1; i >= 0 && i < result.length; i += step) {
      const j = i - step;
      if (active(result[i]!) && !active(result[j]!)) [result[i], result[j]] = [result[j]!, result[i]!];
    }
    return result;
  }
  const byId = new Map(source.nodes.map(n => [n.id, n])), planes = new Map<number, FlowchartNode[]>();
  /** @param node - Ordered source node. @returns Derived background-depth plane or ordinary foreground. */
  function plane(node: FlowchartNode): number {
    if (!isFlowchartContainer(node.shape)) return 100;
    let depth = 0, parent = node.parent;
    while (parent) { depth++; parent = byId.get(parent)?.parent; }
    return depth;
  }
  for (const node of source.nodes) { const key = plane(node), list = planes.get(key) ?? []; list.push(node); planes.set(key, list); }
  const ordered = new Map([...planes].map(([key, cells]) => [key, order(cells)])), offsets = new Map<number, number>();
  const nodes = source.nodes.map(node => { const key = plane(node), index = offsets.get(key) ?? 0; offsets.set(key, index + 1); return ordered.get(key)![index]!; });
  return readFlowchart({ ...source, nodes, edges: order(source.edges) });
}
