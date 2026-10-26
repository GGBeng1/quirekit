import type { FlowchartDocument } from "../../model/types";
import { readFlowchart } from "../../model/document";
import { laneGroup, owningLane, reflowLanes } from "./layout";

/** @param document - Canonical source. @param id - New lane identity. @param selectedId - Reference lane. @returns Empty sibling inserted after the selection, shifting later lanes with content. */
export function addSwimlane(document: FlowchartDocument, id: string, selectedId: string): FlowchartDocument {
  document = readFlowchart(document);
  const lanes = laneGroup(document, selectedId), index = lanes.findIndex(node => node.id === selectedId), reference = lanes[index]!;
  const lane = { ...reference, id, text: "新泳道" }, ordered = [...lanes]; ordered.splice(index + 1, 0, lane);
  return readFlowchart(reflowLanes({ ...document, nodes: [...document.nodes, lane] }, ordered, lanes[0]!));
}
/** @param document - Canonical source. @param selectedId - Lane to move. @param direction - Previous or next position. @returns Reordered lane group retaining all descendant identities and connections. */
export function reorderSwimlane(document: FlowchartDocument, selectedId: string, direction: -1 | 1): FlowchartDocument {
  document = readFlowchart(document);
  if (direction !== -1 && direction !== 1) throw new TypeError("不支持的泳道排序方向");
  const lanes = laneGroup(document, selectedId), origin = lanes[0]!, index = lanes.findIndex(n => n.id === selectedId), next = index + direction;
  if (next < 0 || next >= lanes.length) return document;
  [lanes[index], lanes[next]] = [lanes[next]!, lanes[index]!];
  return readFlowchart(reflowLanes(document, lanes, origin));
}
/** @param document - Canonical source. @param selectedId - Lane and subtree to delete. @returns Compacted siblings with dangling connections removed, suitable for one atomic history batch. */
export function removeSwimlane(document: FlowchartDocument, selectedId: string): FlowchartDocument {
  document = readFlowchart(document);
  const lanes = laneGroup(document, selectedId), byId = new Map(document.nodes.map(n => [n.id, n])), root = new Set([selectedId]);
  if (lanes.length < 2) throw new TypeError("至少保留一条泳道；可用删除图形移除整个泳道组");
  const removed = new Set(document.nodes.filter(node => owningLane(node, root, byId)).map(n => n.id));
  const source = { ...document, nodes: document.nodes.filter(node => !removed.has(node.id)),
    edges: document.edges.filter(edge => !("node" in edge.source && removed.has(edge.source.node)) && !("node" in edge.target && removed.has(edge.target.node))) };
  return readFlowchart(reflowLanes(source, lanes.filter(n => n.id !== selectedId), lanes[0]!));
}
/** @param document - Canonical source. @param selectedId - Member identifying the group. @returns Uniform lane dimensions large enough for every descendant, retaining local offsets. */
export function equalizeSwimlanes(document: FlowchartDocument, selectedId: string): FlowchartDocument {
  document = readFlowchart(document);
  const lanes = laneGroup(document, selectedId), roots = new Set(lanes.map(n => n.id)), byId = new Map(document.nodes.map(n => [n.id, n]));
  let width = Math.max(...lanes.map(n => n.width)), height = Math.max(...lanes.map(n => n.height));
  for (const node of document.nodes) {
    const owner = owningLane(node, roots, byId); if (!owner || owner === node.id) continue;
    const lane = byId.get(owner)!;
    width = Math.max(width, node.x + node.width - lane.x + 24); height = Math.max(height, node.y + node.height - lane.y + 24);
  }
  return readFlowchart(reflowLanes(document, lanes.map(node => ({ ...node, width, height })), lanes[0]!));
}
