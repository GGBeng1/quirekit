import { moveFlowchartSelection, type FlowchartPoint } from "@quirekit/flowchart";
import { toX6Terminal } from "../../codec/edges";
import type { FlowRuntime } from "../types";
import { readGeometrySelection } from "./selection";

/** @param runtime - Writable instance. @param delta - Zoom-independent world translation. */
export function moveSelection(runtime: FlowRuntime, delta: FlowchartPoint): void {
  const { graph } = runtime, before = readGeometrySelection(runtime);
  const after = moveFlowchartSelection(before, graph.getSelectedCells().map(c => c.id), delta);
  graph.batchUpdate("nudge", () => {
    after.nodes.forEach((node, i) => {
      const old = before.nodes[i]!;
      if (old.x !== node.x || old.y !== node.y) {
        const cell = graph.getCellById(node.id); if (cell.isNode()) cell.setPosition(node.x, node.y, { deep: false });
      }
    });
    after.edges.forEach((edge, i) => {
      const old = before.edges[i]!, cell = graph.getCellById(edge.id);
      if (!cell.isEdge()) return;
      if (JSON.stringify(old.source) !== JSON.stringify(edge.source)) cell.setSource(toX6Terminal(edge.source));
      if (JSON.stringify(old.target) !== JSON.stringify(edge.target)) cell.setTarget(toX6Terminal(edge.target));
      if (JSON.stringify(old.vertices) !== JSON.stringify(edge.vertices)) cell.setVertices([...edge.vertices]);
    });
  });
}
