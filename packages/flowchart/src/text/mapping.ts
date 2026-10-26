import type { FlowchartNode } from "../model/types";
import { text as readText } from "../model/validation";
import { isFlowchartTextBoundary, readFlowchartTextSpans } from "./validation";
import { mergeFlowchartTextSpans } from "./ranges";
import type { FlowchartTextSpan } from "./types";

/** @param node - Previous caption and formats. @param text - Replacement canonical text. @returns Caption with retained/rebased range formats, never a second text authority. */
export function replaceFlowchartText(node: FlowchartNode, text: string): FlowchartNode {
  readText(text);
  if (!node.textSpans || node.text === text) return { ...node, text };
  const before = node.text, spans = readFlowchartTextSpans(node.textSpans, before);
  let prefix = 0, suffix = 0;
  while (prefix < Math.min(before.length, text.length) && before[prefix] === text[prefix]) prefix++;
  while (!isFlowchartTextBoundary(before, prefix) || !isFlowchartTextBoundary(text, prefix)) prefix--;
  while (suffix < Math.min(before.length, text.length) - prefix && before[before.length - 1 - suffix] === text[text.length - 1 - suffix]) suffix++;
  while (!isFlowchartTextBoundary(before, before.length - suffix) || !isFlowchartTextBoundary(text, text.length - suffix)) suffix--;
  const oldEnd = before.length - suffix, delta = text.length - before.length;
  const result: FlowchartTextSpan[] = [];
  // Inherit only inside a single format run; replacements crossing boundaries
  // keep both retained sides and use the node default for the replacement.
  for (const span of spans) {
    if (span.from < prefix && span.to > oldEnd) { result.push({ ...span, to: span.to + delta }); continue; }
    if (span.from < prefix) result.push({ ...span, to: Math.min(span.to, prefix) });
    if (span.to > oldEnd) result.push({ ...span, from: Math.max(span.from, oldEnd) + delta, to: span.to + delta });
  }
  const { textSpans: _spans, ...content } = node;
  const mapped = readFlowchartTextSpans(mergeFlowchartTextSpans(result), text);
  return { ...content, text, ...(mapped.length ? { textSpans: mapped } : {}) };
}
