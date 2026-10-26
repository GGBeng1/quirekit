import { instantiateFlowchart, readFlowchart, serializeFlowchart } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import { appendGraph } from "../content";
import type { FlowRuntime } from "../types";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Writable graph. Copies selected roots, descendants and internal edges as one history step. */
export function duplicateStructure(runtime: FlowRuntime): void {
  const { graph } = runtime, ids = new Set<string>();
  for (const cell of graph.getSelectedCells()) { ids.add(cell.id); cell.getDescendants().forEach(child => ids.add(child.id)); }
  const source = readGraph(graph, 0);
  const nodes = source.nodes.filter(node => ids.has(node.id)).map(node => {
    if (!node.parent || ids.has(node.parent)) return node;
    const { parent: _parent, ...detached } = node; return detached;
  });
  if (!nodes.length) return;
  const selected = new Set(nodes.map(node => node.id));
  const edges = source.edges.filter(edge => ("node" in edge.source ? selected.has(edge.source.node) : ids.has(edge.id))
    && ("node" in edge.target ? selected.has(edge.target.node) : ids.has(edge.id)));
  const copy = instantiateFlowchart({ ...source, nodes, edges }, `copy-${uuidv4()}`);
  if (graph.getCellCount() + copy.nodes.length + copy.edges.length > 10000) throw new RangeError("图形数量已达上限");
  serializeFlowchart(readFlowchart({ ...source, nodes: [...source.nodes, ...copy.nodes], edges: [...source.edges, ...copy.edges] }));
  graph.batchUpdate("duplicate", () => appendGraph(runtime, { ...copy, nodes: copy.nodes.map(node => ({ ...node, x: node.x + 24, y: node.y + 24 })),
    edges: copy.edges.map(edge => ({ ...edge, vertices: edge.vertices.map(point => ({ x: point.x + 24, y: point.y + 24 })),
      source: "node" in edge.source ? edge.source : { x: edge.source.x + 24, y: edge.source.y + 24 },
      target: "node" in edge.target ? edge.target : { x: edge.target.x + 24, y: edge.target.y + 24 } })) }));
  graph.resetSelection(copy.nodes.filter(node => !node.parent).map(node => node.id));
}
