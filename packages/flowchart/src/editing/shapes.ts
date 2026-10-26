import type { FlowchartDocument, FlowchartShape } from "../model/types";
import { flowchartShapes } from "../model/shapes";
import { assertFlowchartUnlocked } from "../objects/selection";
import { canTransformFlowchartShape } from "../transform/geometry";

/** @param shape - Proposed semantic kind. @returns Whether a shape is an ordinary interchangeable leaf. */
export function canReplaceFlowchartShape(shape: FlowchartShape): boolean {
  return shape !== "image" && flowchartShapes.includes(shape) && canTransformFlowchartShape(shape);
}
/** @param document - Admitted source or closed selection fragment. @param ids - Exact selected nodes. @param shape - Ordinary replacement. @returns Atomic result retaining all fields except the selected shape kinds. */
export function replaceFlowchartShapes(document: FlowchartDocument, ids: readonly string[], shape: FlowchartShape): FlowchartDocument {
  if (!canReplaceFlowchartShape(shape)) throw new Error("结构图形请使用专用编辑工具");
  const selected = new Set(ids), nodes = document.nodes.filter(n => selected.has(n.id));
  if (!nodes.length || nodes.length !== selected.size) throw new Error("请选择普通图形");
  if (nodes.some(n => !canReplaceFlowchartShape(n.shape)) || document.nodes.some(n => n.parent && selected.has(n.parent))) throw new Error("结构图形请使用专用编辑工具");
  // Fixed outline ports may move after replacing the silhouette. Respect locks
  // on attached edges even though their canonical endpoints stay unchanged.
  const incident = document.edges.filter(e => "node" in e.source && selected.has(e.source.node) || "node" in e.target && selected.has(e.target.node));
  assertFlowchartUnlocked(document, [...ids, ...incident.map(e => e.id)]);
  if (nodes.every(n => n.shape === shape)) return document;
  return { ...document, nodes: document.nodes.map(n => selected.has(n.id) && n.shape !== shape ? { ...n, shape } : n) };
}
