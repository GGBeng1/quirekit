import type { FlowchartDocument, FlowchartNode, FlowchartTerminal } from "../../model/types";
import { readFlowchart } from "../../model/document";
import { fitSequenceContainers } from "../containers";
import { isSequenceParticipant } from "../hierarchy";
import { extendParticipants, livingParticipant, nextEventY } from "./layout";
import type { SequenceMessageKind } from "./types";

/** @param document - Canonical graph. @param id - Fresh edge identity. @param participantIds - Source then target selection. @param kind - Message intent; booleans retain the original reply API. @returns Attached message with preserved prior event positions. */
export function addSequenceMessage(document: FlowchartDocument, id: string, participantIds: readonly string[], kind: SequenceMessageKind | boolean): FlowchartDocument {
  document = readFlowchart(document);
  const mode = typeof kind === "boolean" ? kind ? "reply" : "request" : kind;
  if (!["request", "reply", "async", "self"].includes(mode)) throw new TypeError("不支持的时序消息类型");
  if (participantIds.length !== (mode === "self" ? 1 : 2) || new Set(participantIds).size !== participantIds.length) throw new TypeError(mode === "self" ? "请选择一个参与者" : "请按发送、接收顺序选择两个参与者");
  const selected = participantIds.map(id => livingParticipant(document, id));
  const from = selected[mode === "reply" ? 1 : 0]!, to = mode === "self" ? from : selected[mode === "reply" ? 0 : 1]!;
  if (from.parent !== to.parent) throw new TypeError("请选择同一时序图中的两个参与者");
  const peers = document.nodes.filter(node => isSequenceParticipant(node.shape) && node.parent === from.parent);
  const y = nextEventY(document, peers), targetY = y + (mode === "self" ? 36 : 0);
  // Height projection precedes normalized anchors, preserving every earlier event.
  const source = extendParticipants(document, peers, targetY + 64), next = new Map(source.nodes.map(node => [node.id, node]));
  /** @param participant - Message owner. @param other - Opposite owner. @param eventY - World event Y. @returns Active-bar side or center of its timeline. */
  function attachment(participant: FlowchartNode, other: FlowchartNode, eventY: number): FlowchartTerminal {
    const bar = source.nodes.filter(node => node.parent === participant.id && node.shape === "activation" && node.y <= eventY && node.y + node.height >= eventY).at(-1);
    const node = bar ?? next.get(participant.id)!;
    return { node: node.id, anchor: { x: bar ? (other.x >= participant.x ? 1 : 0) : 0.5, y: (eventY - node.y) / node.height } };
  }
  const x = from.x + from.width / 2 + 90;
  return readFlowchart(fitSequenceContainers({ ...source, edges: [...source.edges, { id, source: attachment(from, to, y), target: attachment(to, from, targetY),
    vertices: mode === "self" ? [{ x, y }, { x, y: targetY }] : [], routing: "straight", connector: "sharp",
    label: mode === "reply" ? "返回结果" : mode === "async" ? "异步通知" : mode === "self" ? "内部处理" : "请求", labelPosition: 0.5,
    style: { dashed: mode === "reply", targetArrow: mode === "reply" || mode === "async" ? "open" : "block" } }] }, new Set(peers.map(node => node.id))));
}
