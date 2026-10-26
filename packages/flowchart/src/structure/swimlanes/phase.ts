import type { FlowchartDocument } from "../../model/types";
import { createFlowchartNode } from "../../model/create";
import { readFlowchart } from "../../model/document";
import { laneGroup } from "./layout";

/** @param document - Canonical graph. @param id - Fresh phase annotation. @param selectedId - Reference lane. @returns Editable phase separator spanning its current pool, with persistent ownership. */
export function addSwimlanePhase(document: FlowchartDocument, id: string, selectedId: string): FlowchartDocument {
  document = readFlowchart(document);
  const lanes = laneGroup(document, selectedId), first = lanes[0]!;
  if (!first.parent) throw new TypeError("请将泳道放入分层容器，再添加阶段线");
  const horizontal = first.shape === "lane-horizontal", left = Math.min(...lanes.map(n => n.x)), top = Math.min(...lanes.map(n => n.y));
  const width = Math.max(...lanes.map(n => n.x + n.width)) - left, height = Math.max(...lanes.map(n => n.y + n.height)) - top;
  const siblings = document.nodes.filter(n => n.parent === first.parent && n.shape === (horizontal ? "phase-vertical" : "phase-horizontal"));
  const fraction = Math.min(0.85, 0.45 + siblings.length * 0.15);
  const phase = { ...createFlowchartNode(id, horizontal ? "phase-vertical" : "phase-horizontal", {
    x: horizontal ? left + width * fraction - 60 : left, y: horizontal ? top : top + height * fraction - 24,
  }, `阶段 ${siblings.length + 1}`), parent: first.parent, width: horizontal ? 120 : width, height: horizontal ? height : 48 };
  return readFlowchart({ ...document, nodes: [...document.nodes, phase] });
}
