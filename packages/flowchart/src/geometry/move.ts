import type { FlowchartDocument, FlowchartPoint } from "../model/types";
import { readFlowchart } from "../model/document";
import { assertFlowchartUnlocked, objectMembers } from "../objects/selection";
import { selectedRoots } from "../arrange/selection";
import { isSequenceParticipant } from "../structure/hierarchy";
import { assertInsideOwner } from "./bounds";

/** @param document - Valid source or closed affected fragment. @param ids - Selected cells. @param delta - World CSS pixel translation. @returns Valid atomic movement retaining ownership and cross-boundary bends. */
export function moveFlowchartSelection(document: FlowchartDocument, ids: readonly string[], delta: FlowchartPoint): FlowchartDocument {
  if (!Number.isFinite(delta.x) || !Number.isFinite(delta.y)) throw new TypeError("无效移动距离");
  const selected = new Set(ids), members = objectMembers(document, ids), roots = selectedRoots(document, ids);
  const nodes = new Map(document.nodes.map(n => [n.id, n]));
  const incident = document.edges.filter(e => "node" in e.source && members.has(e.source.node) || "node" in e.target && members.has(e.target.node));
  assertFlowchartUnlocked(document, [...members, ...incident.map(e => e.id)]);
  for (const node of roots) {
    if (node.shape.startsWith("lane-") || node.shape.startsWith("phase-") || node.shape === "destruction") throw new TypeError("请使用专用结构工具调整这些元素");
    if (isSequenceParticipant(node.shape) && delta.y) throw new TypeError("时序参与者只能横向移动");
    if (node.shape === "activation" && delta.x) throw new TypeError("激活条只能纵向移动");
    if (node.parent) assertInsideOwner({ ...node, x: node.x + delta.x, y: node.y + delta.y }, nodes.get(node.parent)!);
  }
  /** @param point - World point. @returns Translated point without mutating source. */
  function move(point: FlowchartPoint): FlowchartPoint { return { x: point.x + delta.x, y: point.y + delta.y }; }
  // All affected nodes are projected exactly once; vendors must apply positions
  // with deep:false so selected ancestors cannot translate children twice.
  return readFlowchart({ ...document, nodes: document.nodes.map(n => members.has(n.id) ? { ...n, ...move(n) } : n), edges: document.edges.map(edge => {
    const a = "node" in edge.source && members.has(edge.source.node), b = "node" in edge.target && members.has(edge.target.node);
    if (a && b) return { ...edge, vertices: edge.vertices.map(move) };
    if (!selected.has(edge.id)) return edge;
    if ("node" in edge.source || "node" in edge.target) throw new TypeError("请移动连接的图形或直接调整连线端点");
    return { ...edge, source: move(edge.source), target: move(edge.target), vertices: edge.vertices.map(move) };
  }) });
}
