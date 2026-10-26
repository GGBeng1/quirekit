import type { FlowchartDocument, FlowchartNode } from "@quirekit/flowchart";
import type { FlowRuntime } from "./types";
import { toX6Node } from "../codec/nodes";
import { toX6Edge } from "../codec/edges";
import { presentLayer, sourceOrder } from "./structure/layers";

/** @param runtime - Target graph. @returns Next edge layer below every shape. */
export function nextEdgeLayer(runtime: FlowRuntime): number {
  return Math.max(-10001, ...runtime.graph.getEdges().map(e => e.getZIndex() ?? -10001)) + 1;
}
/** @param runtime - Target graph. @param node - Portable shape. */
export function appendNode(runtime: FlowRuntime, node: FlowchartNode): void {
  const order = Math.max(0, ...runtime.graph.getNodes().map(sourceOrder)) + 1;
  const cell = runtime.graph.addNode({ ...toX6Node(node, runtime.appearance, runtime.mount.ownerDocument), qkOrder: order, zIndex: order });
  if (node.parent) runtime.graph.getCellById(node.parent).addChild(cell);
  presentLayer(cell);
}
/** @param runtime - Target graph. @param source - Already validated document to append. */
export function appendGraph(runtime: FlowRuntime, source: FlowchartDocument): void {
  // Explicit layers preserve canonical array order when history restores removed
  // cells in reverse operation order; transient collection insertion is not authority.
  let nodeLayer = Math.max(0, ...runtime.graph.getNodes().map(sourceOrder));
  let edgeLayer = nextEdgeLayer(runtime);
  runtime.graph.addNodes(source.nodes.map(n => ({ ...toX6Node(n, runtime.appearance, runtime.mount.ownerDocument), qkOrder: ++nodeLayer, zIndex: nodeLayer })));
  for (const node of source.nodes) if (node.parent) runtime.graph.getCellById(node.parent).addChild(runtime.graph.getCellById(node.id));
  for (const node of source.nodes) {
    const cell = runtime.graph.getCellById(node.id);
    if (cell.isNode()) presentLayer(cell);
  }
  runtime.graph.addEdges(source.edges.map(e => ({ ...toX6Edge(e, runtime.appearance), zIndex: edgeLayer++ })));
  for (const edge of source.edges) {
    const cell = runtime.graph.getCellById(edge.id);
    if (cell.isEdge()) cell.updateParent();
  }
}
