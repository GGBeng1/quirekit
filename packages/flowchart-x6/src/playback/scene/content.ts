import type { FlowchartDocument } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { toX6Node } from "../../codec/nodes";
import { toX6Edge } from "../../codec/edges";

/** @param runtime - Private, non-authoring presentation graph. @param source - Accepted scene. @param force - Theme boundary requiring fresh attributes. Updates only changed scene cells, retaining untouched identities. */
export function applySceneContent(runtime: FlowRuntime, source: FlowchartDocument, force = false): void {
  const cells = new Map(runtime.graph.getCells().map(cell => [cell.id, cell]));
  const ids = new Set([...source.nodes, ...source.edges].map(cell => cell.id));
  runtime.graph.batchUpdate("playback-scene", () => {
    for (const [id, cell] of cells) if (!ids.has(id)) cell.remove();
    for (const [index, node] of source.nodes.entries()) {
      const cell = runtime.graph.getCellById(node.id), metadata = { ...toX6Node(node, runtime.appearance, runtime.mount.ownerDocument), zIndex: index + 1 };
      if (!cell) runtime.graph.addNode(metadata);
      else if (force || JSON.stringify(cell.getData()?.source) !== JSON.stringify(node)) {
        cell.setProp("position", { x: node.x, y: node.y }); cell.setProp("size", { width: node.width, height: node.height });
        cell.setProp("angle", metadata.angle ?? 0); cell.setProp("shape", metadata.shape); cell.setProp("markup", metadata.markup);
        cell.setProp("ports", metadata.ports);
        cell.setAttrs(metadata.attrs, { overwrite: true }); cell.setData(metadata.data, { overwrite: true });
      }
    }
    for (const node of source.nodes) {
      const cell = runtime.graph.getCellById(node.id), parent = node.parent ? runtime.graph.getCellById(node.parent) : undefined;
      if (cell.getParent() !== parent) { cell.getParent()?.removeChild(cell); parent?.addChild(cell); }
    }
    for (const [index, edge] of source.edges.entries()) {
      const cell = runtime.graph.getCellById(edge.id), metadata = { ...toX6Edge(edge, runtime.appearance), zIndex: index - 10001 };
      if (!cell) runtime.graph.addEdge(metadata);
      else if (force || JSON.stringify(cell.getData()?.source) !== JSON.stringify(edge)) {
        cell.remove(); runtime.graph.addEdge(metadata);
      }
    }
  });
}
