import { flowRuntimeText } from "../locale/messages";
import { addConnectedFlowchartNode, type FlowchartQuickCreate } from "@quirekit/flowchart";
import type { FlowRuntime } from "../types";
import { readGraph } from "../../codec/read";
import { toX6Edge } from "../../codec/edges";
import { appendNode, nextEdgeLayer } from "../content";
import { v4 as uuidv4 } from "uuid";

/** @param runtime - Writable instance. @param options - Explicit creation intent. @returns Newly selected node identity. */
export function addConnectedNode(runtime: FlowRuntime, options: FlowchartQuickCreate): string {
  const { graph } = runtime, selected = graph.getSelectedCells();
  if (selected.length !== 1 || !selected[0]!.isNode()) throw new Error("请选择一个普通图形");
  const id = `node-${uuidv4()}`, edgeId = `edge-${uuidv4()}`;
  const result = addConnectedFlowchartNode(readGraph(graph, runtime.options.document.revision), selected[0]!.id, options, id, edgeId);
  graph.batchUpdate("connected-node", () => {
    const created = result.nodes.at(-1)!;
    appendNode(runtime, { ...created, text: flowRuntimeText(runtime.locale, created.text) });
    graph.addEdge({ ...toX6Edge(result.edges.at(-1)!, runtime.appearance), zIndex: nextEdgeLayer(runtime) }).updateParent();
  });
  graph.resetSelection(id);
  // Reveal only when necessary; creating a neighbor must not reset the user's
  // zoom or recenter all existing content.
  const node = result.nodes.at(-1)!, rect = runtime.mount.getBoundingClientRect(), a = graph.localToClient(node.x, node.y), b = graph.localToClient(node.x + node.width, node.y + node.height);
  const dx = a.x < rect.left + 32 ? rect.left + 32 - a.x : b.x > rect.right - 32 ? rect.right - 32 - b.x : 0;
  const dy = a.y < rect.top + 32 ? rect.top + 32 - a.y : b.y > rect.bottom - 32 ? rect.bottom - 32 - b.y : 0;
  if (dx || dy) { const { tx, ty } = graph.translate(); graph.translate(tx + dx, ty + dy); }
  return id;
}
