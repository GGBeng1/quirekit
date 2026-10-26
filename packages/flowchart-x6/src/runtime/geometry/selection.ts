import type { Cell, Edge, Node } from "@antv/x6";
import type { FlowchartDocument } from "@quirekit/flowchart";
import { readEdge, readNode } from "../../codec/read";
import type { FlowRuntime } from "../types";

/** @param runtime - Live graph. @returns A closed fragment containing selected descendants, incident edges, endpoints and ancestors, without enumerating the graph. */
export function readGeometrySelection(runtime: FlowRuntime): FlowchartDocument {
  const { graph } = runtime, nodes = new Map<string, Node>(), edges = new Map<string, Edge>();
  const members = new Map<string, Cell>();
  for (const cell of graph.getSelectedCells()) { members.set(cell.id, cell); for (const child of cell.getDescendants()) members.set(child.id, child); }
  /** @param cell - Node and its bounded ownership chain. */
  function include(cell: Cell | null): void {
    while (cell) { if (!cell.isNode() || nodes.has(cell.id)) return; nodes.set(cell.id, cell); cell = cell.getParent(); }
  }
  // The graph adjacency index owns lookup cost. Only incident connections and
  // their endpoint owners are read; unrelated graph source is never serialized.
  for (const cell of members.values()) {
    if (cell.isNode()) { include(cell); for (const edge of graph.getConnectedEdges(cell)) edges.set(edge.id, edge); }
    else if (cell.isEdge()) edges.set(cell.id, cell);
  }
  for (const edge of edges.values()) { include(edge.getSourceCell()); include(edge.getTargetCell()); }
  return { format: "quirekit-flowchart", version: 1, revision: runtime.options.document.revision, nodes: [...nodes.values()].map(readNode), edges: [...edges.values()].map(readEdge) };
}
