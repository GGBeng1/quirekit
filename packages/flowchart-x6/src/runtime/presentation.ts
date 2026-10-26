import { isLocked } from "./structure/permissions";
import type { Cell, Edge } from "@antv/x6";
import type { FlowRuntime } from "./types";
import { nodeAttrs, nodePorts, nodeMarkup } from "../codec/nodes";
import { edgeAttrs, edgeGeometry, edgeLabels } from "../codec/edges";
import { readNode, readEdge } from "../codec/read";

/** @param cell - Cell with changed canonical data. @param runtime - Current theme. @param fromData - Whether a canonical data command owns the angle update. */
export function presentCell(cell: Cell, runtime: FlowRuntime, fromData = false): void {
  // Derived attributes never create a second history entry or content invalidation.
  const options = { qkDerived: true };
  if (cell.isNode()) {
    if (fromData) cell.rotate(cell.getData().source.rotation ?? 0, { absolute: true, ...options });
    const node = readNode(cell);
    const previousMarkup = cell.getMarkup(), wasRich = Array.isArray(previousMarkup) && previousMarkup.some(item => item.selector === "richLabel");
    if (node.entity || node.uml || node.textSpans?.length || wasRich) {
      const markup = nodeMarkup(node, runtime.appearance, runtime.mount.ownerDocument);
      if (JSON.stringify(cell.getMarkup()) !== JSON.stringify(markup)) cell.setMarkup(markup, options);
    }
    cell.replaceAttrs(nodeAttrs(node, runtime.appearance), options);
    cell.setProp("ports", nodePorts(node, runtime.appearance), options);
  }
  else if (cell.isEdge()) {
    const edge = readEdge(cell);
    cell.setProp(edgeGeometry(edge), options);
    // Markers are complete projections: merging keeps the previous preset's
    // name/children and can corrupt a hollow endpoint after switching or undo.
    cell.replaceAttrs({ wrap: { connection: true }, ...edgeAttrs(edge, runtime.appearance) }, options);
    cell.setLabels(edgeLabels(edge, runtime.appearance), options);
    if (runtime.graph.isSelected(cell)) presentEdgeTools(cell, runtime);
  }
}

/** @param edge - Selected connector, with vendor-owned drag behavior. @param runtime - Theme and permission authority. */
export function presentEdgeTools(edge: Edge, runtime: FlowRuntime): void {
  const options = { qkDerived: true };
  edge.removeTools(options);
  if (runtime.readOnly || runtime.presenting || isLocked(edge) || !runtime.graph.isSelected(edge)) return;
  const attrs = { fill: runtime.appearance.surface, stroke: runtime.appearance.primary, "stroke-width": 1.5 };
  // Endpoint controls must remain visually distinct from the real arrowheads.
  // Styling uses public tool arguments; X6 still owns hit handling and history.
  const endpoint = { ...attrs, d: "M -4.5 0 A 4.5 4.5 0 1 0 4.5 0 A 4.5 4.5 0 1 0 -4.5 0 Z" };
  edge.addTools([
    { name: "vertices", args: { attrs: { ...attrs, r: 4.5 } } },
    { name: "segments", args: { attrs: { ...attrs, width: 14, height: 6, x: -7, y: -3, rx: 3, ry: 3 } } },
    { name: "source-arrowhead", args: { attrs: endpoint } },
    { name: "target-arrowhead", args: { attrs: endpoint } },
  ], options);
}
