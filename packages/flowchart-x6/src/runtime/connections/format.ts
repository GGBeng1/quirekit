import { readFlowchart, type FlowchartEdge } from "@quirekit/flowchart";
import { readGraph } from "../../codec/read";
import type { FlowRuntime } from "../types";

/** @param runtime - Writable graph. @param update - Immutable direct-edge update. Applies one validated history entry. */
export function updateSelectedEdges(runtime: FlowRuntime, update: (edge: FlowchartEdge) => FlowchartEdge): void {
  const selected = new Set(runtime.graph.getSelectedCells().filter(c => c.isEdge()).map(c => c.id));
  if (!selected.size) return;
  const source = readGraph(runtime.graph, runtime.options.document.revision);
  const checked = readFlowchart({ ...source, edges: source.edges.map(e => selected.has(e.id) ? update(e) : e) });
  runtime.graph.batchUpdate("connection", () => {
    for (const edge of checked.edges) if (selected.has(edge.id)) {
      const cell = runtime.graph.getCellById(edge.id);
      if (!cell.isEdge()) continue;
      cell.setVertices([...edge.vertices]); cell.setData({ source: edge }, { overwrite: true });
      // Native dragged labels are geometry authority until an explicit layout
      // command replaces them; setData alone would re-read the previous offset.
      cell.setLabels([{ ...cell.getLabels()[0], position: { distance: edge.labelPosition, offset: edge.labelOffset ?? 12, options: { keepGradient: false } } }]);
    }
  });
}
