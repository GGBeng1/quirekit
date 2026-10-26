import type { FlowchartDocument, FlowchartNode, FlowchartTerminal } from "../../model/types";
import { isSequenceParticipant } from "../hierarchy";

/** @param node - Participant dimensions. @returns Header extent before its dashed timeline. */
export function sequenceHeaderHeight(node: Pick<FlowchartNode, "shape" | "height">): number {
  return Math.min(node.shape === "actor-lifeline" ? 112 : 56, node.height / 3);
}
/** @param document - Valid source. @param id - Participant identity. @returns Selected living participant or a useful creation error. */
export function livingParticipant(document: FlowchartDocument, id: string): FlowchartNode {
  const node = document.nodes.find(item => item.id === id && isSequenceParticipant(item.shape));
  if (!node) throw new TypeError("请选择时序图参与者");
  if (document.nodes.some(item => item.parent === id && item.shape === "destruction")) throw new TypeError("该参与者已销毁，不能再添加事件");
  return node;
}
/** @param document - Valid source. @param peers - Participants in one diagram. @returns Event baseline below every earlier attached message. */
export function nextEventY(document: FlowchartDocument, peers: readonly FlowchartNode[]): number {
  const ids = new Set(peers.map(node => node.id)), byId = new Map(document.nodes.map(node => [node.id, node]));
  let y = Math.max(...peers.map(node => node.y + sequenceHeaderHeight(node) + 56));
  for (const edge of document.edges) for (const end of [edge.source, edge.target]) {
    if (!("node" in end) || !end.anchor) continue;
    const node = byId.get(end.node)!;
    if (ids.has(node.id) || (node.parent && ids.has(node.parent))) y = Math.max(y, node.y + end.anchor.y * node.height + 48);
  }
  return y;
}
/** @param document - Valid source. @param heights - New participant heights. @returns Reprojected anchors retaining their world Y. */
export function resizeParticipants(document: FlowchartDocument, heights: ReadonlyMap<string, number>): FlowchartDocument {
  const old = new Map(document.nodes.map(node => [node.id, node]));
  /** @param terminal - Existing attachment. @returns Normalized anchor with unchanged world position. */
  function anchor(terminal: FlowchartTerminal): FlowchartTerminal {
    if (!("node" in terminal) || !terminal.anchor || !heights.has(terminal.node)) return terminal;
    return { ...terminal, anchor: { ...terminal.anchor, y: terminal.anchor.y * old.get(terminal.node)!.height / heights.get(terminal.node)! } };
  }
  return { ...document, nodes: document.nodes.map(node => heights.has(node.id) ? { ...node, height: heights.get(node.id)! } : node),
    edges: document.edges.map(edge => ({ ...edge, source: anchor(edge.source), target: anchor(edge.target) })) };
}
/** @param document - Valid source. @param peers - Participants to extend. @param bottom - Required world bottom. @returns Living timelines extended without moving previous events or destruction marks. */
export function extendParticipants(document: FlowchartDocument, peers: readonly FlowchartNode[], bottom: number): FlowchartDocument {
  const dead = new Set(document.nodes.filter(node => node.shape === "destruction").map(node => node.parent));
  return resizeParticipants(document, new Map(peers.filter(node => !dead.has(node.id)).map(node => [node.id, Math.max(node.height, bottom - node.y)])));
}
