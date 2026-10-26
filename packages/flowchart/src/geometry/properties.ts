import type { FlowchartDocument, FlowchartNode, FlowchartShape } from "../model/types";
import { readFlowchart } from "../model/document";
import { record, number } from "../model/validation";
import { selectedRoots } from "../arrange/selection";
import { assertFlowchartUnlocked, objectMembers } from "../objects/selection";
import { canTransformFlowchartShape } from "../transform/geometry";
import { isSequenceParticipant } from "../structure/hierarchy";
import { assertInsideOwner } from "./bounds";
import type { FlowchartGeometryField, FlowchartGeometryPatch } from "./types";

/** @param shape - Canonical semantic kind. @param field - Exact property. @returns Whether editing it preserves structural ownership. */
export function canSetFlowchartGeometry(shape: FlowchartShape, field: FlowchartGeometryField): boolean {
  if (field === "rotation" || field === "width" || field === "height") return canTransformFlowchartShape(shape);
  if (shape.startsWith("lane-") || shape.startsWith("phase-") || shape === "destruction") return false;
  return field === "x" ? shape !== "activation" : !isSequenceParticipant(shape);
}
/** @param document - Valid source or closed affected fragment. @param ids - Explicit node selection. @param patch - Finite exact fields. @returns Valid atomic result; nested roots and internal bends move only once. */
export function setFlowchartGeometry(document: FlowchartDocument, ids: readonly string[], patch: FlowchartGeometryPatch): FlowchartDocument {
  const fields = Object.keys(record(patch, ["x", "y", "width", "height", "rotation"], "geometry")) as FlowchartGeometryField[];
  for (const key of fields) {
    number(patch[key], key === "x" || key === "y" ? -1e6 : key === "rotation" ? 0 : 20,
      key === "x" || key === "y" ? 1e6 : key === "rotation" ? 360 : 10000, key);
    if (key === "rotation" && patch.rotation === 360) throw new RangeError("rotation: expected [0,360)");
  }
  const roots = selectedRoots(document, ids), updates = new Map<string, FlowchartNode>(), members = objectMembers(document, roots.map(n => n.id));
  if (!roots.length) throw new Error("请选择图形");
  const incident = document.edges.filter(e => "node" in e.source && members.has(e.source.node) || "node" in e.target && members.has(e.target.node));
  assertFlowchartUnlocked(document, [...members, ...incident.map(e => e.id)]);
  for (const node of roots) {
    if (fields.some(key => !canSetFlowchartGeometry(node.shape, key))) throw new Error("结构图形请使用专用编辑工具");
    updates.set(node.id, { ...node, ...patch });
  }
  const byId = new Map(document.nodes.map(n => [n.id, n])), movements = new Map<string, { x: number; y: number }>();
  // Local dimensions/angles apply only to roots; descendants inherit world
  // translation. Incomplete multi-selection must never resize or rotate children.
  const nodes = document.nodes.map(node => {
    let root: FlowchartNode | undefined = node;
    while (root && !updates.has(root.id)) root = root.parent ? byId.get(root.parent) : undefined;
    if (!root) return node;
    const next = updates.get(root.id)!, delta = { x: next.x - root.x, y: next.y - root.y }; movements.set(node.id, delta);
    return node.id === root.id ? next : { ...node, x: node.x + delta.x, y: node.y + delta.y };
  });
  for (const root of roots) if (root.parent) assertInsideOwner(updates.get(root.id)!, byId.get(root.parent)!);
  return readFlowchart({ ...document, nodes, edges: document.edges.map(edge => {
    const a = "node" in edge.source ? movements.get(edge.source.node) : undefined, b = "node" in edge.target ? movements.get(edge.target.node) : undefined;
    return a && b && a.x === b.x && a.y === b.y ? { ...edge, vertices: edge.vertices.map(p => ({ x: p.x + a.x, y: p.y + a.y })) } : edge;
  }) });
}
