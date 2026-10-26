import type { FlowchartDocument } from "../../model/types";
import { createFlowchartNode } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { fitSequenceContainers } from "../containers";
import { isSequenceParticipant } from "../hierarchy";
import { nextEventY } from "./layout";
import type { SequenceFragmentKind } from "./types";

/** @param document - Canonical graph. @param id - Fresh frame identity. @param participantIds - Optional selection restricting frame width. @param kind - Fragment operator. @returns Frame and independently editable guards without reparenting crossing timelines. */
export function addSequenceFragment(document: FlowchartDocument, id: string, participantIds: readonly string[], kind: SequenceFragmentKind): FlowchartDocument {
  document = readFlowchart(document);
  if (!["alt", "opt", "loop"].includes(kind)) throw new TypeError("不支持的时序片段");
  const all = document.nodes.filter(node => isSequenceParticipant(node.shape)), selected = all.filter(node => participantIds.includes(node.id));
  const first = selected[0] ?? all[0], peers = (selected.length ? selected : all).filter(node => node.parent === first?.parent);
  if (selected.some(node => node.parent !== first?.parent)) throw new TypeError("请选择同一时序图中的参与者");
  const x = peers.length ? Math.min(...peers.map(node => node.x)) : 80, y = first ? first.y + 136 : 80;
  const frame = { ...createFlowchartNode(id, `sequence-${kind}`, { x, y }, kind), width: peers.length ? Math.max(320, ...peers.map(node => node.x + node.width - x)) : 600,
    height: peers.length ? Math.max(280, nextEventY(document, peers) + 32 - y) : 280, ...(first?.parent ? { parent: first.parent } : {}) };
  const labels = kind === "alt" ? ["[条件成立]", "[否则]"] : [kind === "loop" ? "[重复条件]" : "[条件成立]"];
  const guards = labels.map((text, index) => ({ ...createFlowchartNode(`${id}-guard-${index}`, "text", { x: x + 16, y: y + (index ? frame.height / 2 + 12 : 42) }, text),
    parent: id, width: Math.min(200, frame.width - 32), height: 28 }));
  return readFlowchart(fitSequenceContainers({ ...document, nodes: [...document.nodes, frame, ...guards] }, new Set([id])));
}
