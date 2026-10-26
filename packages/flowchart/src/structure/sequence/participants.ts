import type { FlowchartDocument } from "../../model/types";
import { createFlowchartNode } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { fitSequenceContainers } from "../containers";
import { isSequenceParticipant } from "../hierarchy";
import { extendParticipants, livingParticipant, nextEventY, resizeParticipants, sequenceHeaderHeight } from "./layout";

/** @param document - Canonical graph. @param id - Fresh identity. @param referenceId - Selected participant. @param actor - Whether to use a person header. @returns Appended participant on the same baseline and owner. */
export function addSequenceParticipant(document: FlowchartDocument, id: string, referenceId?: string, actor = false): FlowchartDocument {
  document = readFlowchart(document);
  const participants = document.nodes.filter(node => isSequenceParticipant(node.shape));
  const reference = participants.find(node => node.id === referenceId) ?? participants[0];
  const siblings = participants.filter(node => node.parent === reference?.parent);
  const x = siblings.length ? Math.max(...siblings.map(node => node.x + node.width)) + 120 : 80;
  const node = createFlowchartNode(id, actor ? "actor-lifeline" : "lifeline", { x, y: reference?.y ?? 80 }, actor ? "用户" : "新参与者");
  return readFlowchart(fitSequenceContainers({ ...document, nodes: [...document.nodes, { ...node, height: Math.max(node.height, reference?.height ?? 0),
    ...(reference?.parent ? { parent: reference.parent } : {}) }] }, new Set([id])));
}
/** @param document - Canonical graph. @param id - Fresh identity. @param participantId - Selected participant. @returns Owned activation with sufficient timeline length. */
export function addSequenceActivation(document: FlowchartDocument, id: string, participantId: string): FlowchartDocument {
  document = readFlowchart(document);
  const participant = livingParticipant(document, participantId);
  const bars = document.nodes.filter(node => node.parent === participant.id && node.shape === "activation");
  const y = Math.max(participant.y + sequenceHeaderHeight(participant) + 56, ...bars.map(node => node.y + node.height + 40));
  const source = extendParticipants(document, [participant], y + 160);
  return readFlowchart(fitSequenceContainers({ ...source, nodes: [...source.nodes, { ...createFlowchartNode(id, "activation", { x: participant.x + participant.width / 2 - 10, y }, ""), parent: participant.id }] }, new Set([id])));
}
/** @param document - Canonical graph. @param id - Fresh marker identity. @param participantId - Selected living participant. @returns Timeline terminated below its messages and activation bars, retaining previous anchors. */
export function addSequenceDestruction(document: FlowchartDocument, id: string, participantId: string): FlowchartDocument {
  document = readFlowchart(document);
  const participant = livingParticipant(document, participantId);
  const peers = document.nodes.filter(node => isSequenceParticipant(node.shape) && node.parent === participant.parent);
  const bars = document.nodes.filter(node => node.parent === participantId && node.shape === "activation");
  const y = Math.max(nextEventY(document, peers), ...bars.map(node => node.y + node.height + 24));
  const source = resizeParticipants(document, new Map([[participantId, y - participant.y]]));
  const marker = { ...createFlowchartNode(id, "destruction", { x: participant.x + participant.width / 2 - 12, y: y - 12 }, ""), parent: participantId };
  return readFlowchart(fitSequenceContainers({ ...source, nodes: [...source.nodes, marker] }, new Set([id])));
}
