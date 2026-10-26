import { record } from "../model/validation";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { readFlowchart } from "../model/document";
import { assertFlowchartUnlocked } from "../objects/selection";
import type { FlowchartNodeContent } from "./types";

/** @param document - Current graph. @param id - Existing node. @param content - Atomic content replacement. @param expected - Optional opening snapshot for stale-draft rejection. @returns Valid graph, expanded vertically to accommodate edited rows. */
export function updateFlowchartContent(document: FlowchartDocument, id: string, content: FlowchartNodeContent, expected?: FlowchartNode): FlowchartDocument {
  record(content, ["text", "entity", "uml"], "content");
  assertFlowchartUnlocked(document, [id]);
  const node = document.nodes.find(node => node.id === id);
  if (expected && JSON.stringify(expected) !== JSON.stringify(node)) throw new Error("图形已更新，请重新打开编辑");
  if (!node) throw new Error("图形已不存在");
  const { entity: _entity, uml: _uml, ...base } = node;
  // Validate content before computing dimensions. Invalid input never reaches
  // the vendor model, and the explicit command owns one complete admission pass.
  const checked = readFlowchart({ ...document, nodes: document.nodes.map(n => n.id === id ? { ...base, ...content } : n) });
  return Object.freeze({ ...checked, nodes: Object.freeze(checked.nodes.map(n => {
    if (n.id !== id || !n.entity && !n.uml) return n;
    const rows = n.entity ? Math.max(1, n.entity.fields.length) : Math.max(1, n.uml!.attributes.length) + Math.max(1, n.uml!.operations.length);
    return Object.freeze({ ...n, height: Math.max(n.height, Math.min(10000, 40 + (n.uml ? 24 : 16) + rows * (n.style.fontSize ?? 14) * 1.5)) });
  })) });
}
