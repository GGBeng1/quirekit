import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { readFlowchart } from "../model/document";
import { assertFlowchartUnlocked } from "../objects/selection";
import { canFormatFlowchartText, readFlowchartTextSpans } from "./validation";
import type { FlowchartTextSpan } from "./types";
export { replaceFlowchartText } from "./mapping";
export { applyFlowchartTextFormat } from "./ranges";

/** @param document - Source authority. @param id - Target. @param text - Complete replacement text. @param spans - Complete replacement overrides. @param expected - Opening snapshot. @returns One validated caption/range replacement. */
export function updateFlowchartText(document: FlowchartDocument, id: string, text: string, spans: readonly FlowchartTextSpan[], expected?: FlowchartNode): FlowchartDocument {
  const before = readFlowchart(document), node = before.nodes.find(item => item.id === id);
  if (!node || !canFormatFlowchartText(node)) throw new Error("请选择普通文字节点");
  assertFlowchartUnlocked(before, [id]);
  const opened = expected ? readFlowchart({ ...before, nodes: before.nodes.map(item => item.id === id ? expected : item) }).nodes.find(item => item.id === id) : undefined;
  if (expected && JSON.stringify(opened) !== JSON.stringify(node)) throw new Error("编辑目标已改变，请重新打开");
  const checked = readFlowchartTextSpans(spans, text), { textSpans: _previous, ...content } = node;
  return readFlowchart({ ...before, nodes: before.nodes.map(item => item.id === id ? { ...content, text, ...(checked.length ? { textSpans: checked } : {}) } : item) });
}
