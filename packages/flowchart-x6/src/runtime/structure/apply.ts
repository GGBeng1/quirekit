import { presentLayer } from "./layers";
import type { FlowchartDocument, FlowchartNode } from "@quirekit/flowchart";
import { toX6Edge, toX6Terminal } from "../../codec/edges";
import { appendNode, nextEdgeLayer } from "../content";
import type { FlowRuntime } from "../types";

/** @param runtime - Writable graph. @param before - Source captured once before the command. @param after - Validated structural result. @param selection - Post-command selection. Applies one history transaction without replacing unchanged cells. */
export function applyStructure(runtime: FlowRuntime, before: FlowchartDocument, after: FlowchartDocument, selection: readonly string[]): void {
  const { graph } = runtime, nodes = new Map(after.nodes.map(node => [node.id, node]));
  const oldNodes = new Map(before.nodes.map(node => [node.id, node])), oldEdges = new Map(before.edges.map(edge => [edge.id, edge]));
  const retained = new Set([...nodes.keys(), ...after.edges.map(edge => edge.id)]);
  /** @param node - Acyclic source node. @returns Parent depth for creation and absolute-position ordering. */
  function depth(node: FlowchartNode): number { let parent = node.parent, count = 0; while (parent) { count++; parent = nodes.get(parent)?.parent; } return count; }
  graph.batchUpdate("structure", () => {
    // Detach retained descendants before removing an owner. X6 removal is deep;
    // reversing this order would silently delete live members during ungroup.
    for (const cell of graph.getCells()) if (retained.has(cell.id) && cell.getParentId() && !retained.has(cell.getParentId()!)) cell.getParent()?.unembed(cell);
    for (const cell of [...before.edges, ...before.nodes]) if (!retained.has(cell.id) && graph.hasCell(cell.id)) graph.getCellById(cell.id).remove();
    // Parent-first creation establishes ownership; deep:false keeps child world
    // positions authoritative. Every child and bend is applied exactly once.
    for (const node of [...after.nodes].sort((a, b) => depth(a) - depth(b))) {
      const cell = graph.getCellById(node.id), old = oldNodes.get(node.id);
      if (!cell) { appendNode(runtime, runtime.drawing === "standard" || node.style.drawing ? node : { ...node, style: { ...node.style, drawing: runtime.drawing } }); continue; }
      if (!cell.isNode()) continue;
      if (cell.getParentId() !== node.parent) {
        cell.getParent()?.unembed(cell); if (node.parent) graph.getCellById(node.parent).addChild(cell);
      }
      const size = cell.getSize(), point = cell.getPosition();
      if (size.width !== node.width || size.height !== node.height) cell.resize(node.width, node.height);
      if (point.x !== node.x || point.y !== node.y) cell.setPosition(node.x, node.y, { deep: false });
      if (old?.rotation !== node.rotation || old?.flipX !== node.flipX || old?.flipY !== node.flipY || JSON.stringify(old?.uml) !== JSON.stringify(node.uml) || JSON.stringify(old?.entity) !== JSON.stringify(node.entity) || JSON.stringify(old?.image) !== JSON.stringify(node.image) || JSON.stringify(old?.textSpans) !== JSON.stringify(node.textSpans) || old?.locked !== node.locked || old?.text !== node.text || old?.shape !== node.shape || JSON.stringify(old?.style) !== JSON.stringify(node.style)) cell.setData({ source: node }, { overwrite: true });
    }
    for (const edge of after.edges) {
      const cell = graph.getCellById(edge.id), previous = oldEdges.get(edge.id);
      if (!cell) {
        const source = runtime.drawing === "standard" || edge.style.drawing ? edge : { ...edge, style: { ...edge.style, drawing: runtime.drawing } };
        const added = graph.addEdge({ ...toX6Edge(source, runtime.appearance), zIndex: nextEdgeLayer(runtime) }); added.updateParent(); continue;
      }
      if (!cell.isEdge()) continue;
      if (JSON.stringify(previous?.source) !== JSON.stringify(edge.source)) cell.setSource(toX6Terminal(edge.source));
      if (JSON.stringify(previous?.target) !== JSON.stringify(edge.target)) cell.setTarget(toX6Terminal(edge.target));
      if (JSON.stringify(cell.getVertices()) !== JSON.stringify(edge.vertices)) cell.setVertices([...edge.vertices]);
      if (JSON.stringify(previous) !== JSON.stringify(edge)) cell.setData({ source: edge }, { overwrite: true });
      cell.updateParent();
    }
    // Canonical array order is the undoable authority; container depth is only
    // a derived paint plane and must never enter the history separately.
    after.nodes.forEach((node, order) => {
      const cell = graph.getCellById(node.id);
      if (cell.isNode()) { if (cell.getProp("qkOrder") !== order + 1) cell.setProp("qkOrder", order + 1); presentLayer(cell); }
    });
    after.edges.forEach((edge, order) => graph.getCellById(edge.id).setZIndex(-10000 + order));
  });
  graph.resetSelection(selection.filter(id => graph.hasCell(id)));
}
