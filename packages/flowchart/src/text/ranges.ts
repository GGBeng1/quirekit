import { isFlowchartTextBoundary, readFlowchartTextFormat, readFlowchartTextSpans } from "./validation";
import type { FlowchartTextFormat, FlowchartTextPatch, FlowchartTextSpan } from "./types";
import { record } from "../model/validation";

/** @param span - Range. @returns Format fields in a stable comparison order. */
export function flowchartSpanFormat(span: FlowchartTextSpan): FlowchartTextFormat { const { from: _from, to: _to, ...format } = span; return readFlowchartTextFormat(format); }
/** @param spans - Ordered disjoint ranges. @returns Equivalent ranges with adjacent equal formatting merged. */
export function mergeFlowchartTextSpans(spans: readonly FlowchartTextSpan[]): readonly FlowchartTextSpan[] {
  const result: FlowchartTextSpan[] = [];
  for (const span of spans) {
    const previous = result.at(-1);
    if (previous?.to === span.from && JSON.stringify(flowchartSpanFormat(previous)) === JSON.stringify(flowchartSpanFormat(span))) result[result.length - 1] = { ...previous, to: span.to };
    else result.push(span);
  }
  return result;
}
/** @param text - Caption authority. @param spans - Admitted overrides. @param from - Selected start. @param to - Selected end. @param patch - Fields to set/reset. @returns Atomic range-only formatting result. */
export function applyFlowchartTextFormat(text: string, spans: readonly FlowchartTextSpan[], from: number, to: number, patch: FlowchartTextPatch): readonly FlowchartTextSpan[] {
  const existing = readFlowchartTextSpans(spans, text), checked = record(patch, ["bold", "italic", "underline", "strike", "fontSize", "color", "link"], "textPatch");
  readFlowchartTextFormat(Object.fromEntries(Object.entries(checked).filter(([, value]) => value !== null)));
  if (!isFlowchartTextBoundary(text, from) || !isFlowchartTextBoundary(text, to) || to <= from) throw new TypeError("textSpans: select a nonempty range");
  // Split at every authority boundary before changing only the selected intervals.
  const points = [...new Set([from, to, ...existing.flatMap(span => [span.from, span.to])])].sort((a, b) => a - b), result: FlowchartTextSpan[] = [];
  let index = 0;
  for (let i = 0; i < points.length - 1; i++) {
    const start = points[i]!, end = points[i + 1]!;
    while (existing[index] && existing[index]!.to <= start) index++;
    const span = existing[index];
    const format = { ...(span && span.from <= start && span.to >= end ? flowchartSpanFormat(span) : {}) } as Record<string, unknown>;
    if (start >= from && end <= to) for (const [key, value] of Object.entries(checked)) { if (value === null) delete format[key]; else format[key] = value; }
    if (Object.keys(format).length) result.push({ from: start, to: end, ...readFlowchartTextFormat(format) });
  }
  return readFlowchartTextSpans(mergeFlowchartTextSpans(result), text);
}
