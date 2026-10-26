import type { FlowchartNode } from "@quirekit/flowchart";
import type { FlowchartAppearance } from "../types";
import type { CaptionFormat, CaptionGlyph } from "./types";

/** @param node - Text and ordered range authority. @param theme - Default typography. @returns Bounded source-order graphemes, split only at explicit format boundaries. */
export function captionGlyphs(node: FlowchartNode, theme: FlowchartAppearance): readonly CaptionGlyph[] {
  const spans = node.textSpans ?? [], result: CaptionGlyph[] = [];
  let current = 0;
  for (const segment of new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(node.text)) {
    let from = segment.index, end = from + segment.segment.length;
    while (from < end) {
      while (spans[current] && spans[current]!.to <= from) current++;
      const span = spans[current], active = span && span.from <= from ? span : undefined;
      const to = Math.min(end, active?.to ?? (span ? span.from : end));
      const format: CaptionFormat = { bold: active?.bold ?? node.style.bold ?? false, italic: active?.italic ?? false, underline: active?.underline ?? !!active?.link, strike: active?.strike ?? false, fontSize: active?.fontSize ?? node.style.fontSize ?? 14,
        color: active?.color ?? node.style.color ?? theme.text, ...(active?.link ? { link: active.link } : {}) };
      result.push({ text: node.text.slice(from, to), format, key: JSON.stringify(format) }); from = to;
    }
  }
  return result;
}
