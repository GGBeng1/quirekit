import type { FlowchartNode } from "@quirekit/flowchart";
import { captionLayout } from "../geometry/caption";
import type { FlowchartAppearance } from "../types";
import { captionGlyphs } from "./glyphs";
import type { CaptionGlyph, CaptionLine, CaptionMeasure, CaptionRun } from "./types";

/** @param glyphs - Ordered glyphs. @returns Adjacent equal-style glyphs combined for native shaping/kerning. */
function runs(glyphs: readonly CaptionGlyph[]): CaptionGlyph[] {
  const result: CaptionGlyph[] = [];
  for (const glyph of glyphs) { const previous = result.at(-1); if (previous?.key === glyph.key) result[result.length - 1] = { ...previous, text: previous.text + glyph.text }; else result.push(glyph); }
  return result;
}
/** @param glyphs - Grapheme stream including newlines. @param width - Safe local width. @param measure - Native font measurement. @returns Word-aware lines with grapheme fallback for overlong words. */
function wrap(glyphs: readonly CaptionGlyph[], width: number, measure: CaptionMeasure): CaptionLine[] {
  const lines: CaptionLine[] = [];
  let start = 0;
  while (start < glyphs.length) {
    let end = start, lastBreak = start, total = 0, runText = "", runWidth = 0, key = "";
    while (end < glyphs.length && !/[\r\n]/u.test(glyphs[end]!.text)) {
      const glyph = glyphs[end]!, same = key === glyph.key, nextText = same ? runText + glyph.text : glyph.text;
      const nextWidth = measure(nextText, glyph.format), nextTotal = total + nextWidth - (same ? runWidth : 0);
      if (end > start && nextTotal > width) break;
      total = nextTotal; runText = nextText; runWidth = nextWidth; key = glyph.key; end++;
      if (/\s|[-/]|\p{Script=Han}|\p{Script=Hiragana}|\p{Script=Katakana}/u.test(glyph.text)) lastBreak = end;
    }
    const newline = end < glyphs.length && /[\r\n]/u.test(glyphs[end]!.text);
    const stop = !newline && end < glyphs.length && lastBreak > start ? lastBreak : end;
    const content = glyphs.slice(start, stop), lineRuns = runs(content);
    const height = Math.max(10, ...content.map(glyph => glyph.format.fontSize), glyphs[start]!.format.fontSize) * 1.4;
    lines.push({ runs: lineRuns, height }); start = stop + (newline && stop === end ? 1 : 0);
  }
  return lines;
}
/** @param node - Caption authority. @param theme - Default typography. @param measure - Native font resolver. @returns Node-local positioned SVG runs; clipped display never changes text or spans. */
export function layoutCaption(node: FlowchartNode, theme: FlowchartAppearance, measure: CaptionMeasure): readonly CaptionRun[] {
  const box = captionLayout(node), glyphs = captionGlyphs(node, theme);
  const lines = wrap(glyphs, box.width, measure), visible: CaptionLine[] = [];
  let height = 0;
  for (const line of lines) { if (visible.length && height + line.height > box.height) break; visible.push(line); height += line.height; }
  if (visible.length < lines.length && visible.length) {
    const last = visible.at(-1)!, textRuns = [...last.runs], format = textRuns.at(-1)?.format ?? glyphs[0]!.format;
    // Trim whole graphemes, then append one visible overflow marker. Source
    // offsets remain in canonical text and are never rewritten by layout.
    const ellipsis = { text: "…", format, key: JSON.stringify(format) }, marker = measure("…", format);
    let width = textRuns.reduce((sum, run) => sum + measure(run.text, run.format), 0);
    while (textRuns.length && width + marker > box.width) {
      const run = textRuns.at(-1)!, parts = [...new Intl.Segmenter(undefined, { granularity: "grapheme" }).segment(run.text)];
      const shortened = run.text.slice(0, parts.at(-1)!.index); width -= measure(run.text, run.format) - measure(shortened, run.format);
      if (shortened) textRuns[textRuns.length - 1] = { ...run, text: shortened }; else textRuns.pop();
    }
    visible[visible.length - 1] = { ...last, runs: [...textRuns, ellipsis] };
  }
  let top = box.top + (box.verticalAnchor === "top" ? 0 : box.verticalAnchor === "bottom" ? box.height - height : (box.height - height) / 2);
  const result: CaptionRun[] = [];
  for (const line of visible) {
    const widths = line.runs.map(run => measure(run.text, run.format)), width = widths.reduce((a, b) => a + b, 0);
    let x = box.left + (box.anchor === "start" ? 0 : box.anchor === "end" ? box.width - width : (box.width - width) / 2);
    const maxSize = line.height / 1.4, y = top + (line.height - maxSize) / 2 + maxSize * .8;
    line.runs.forEach((run, index) => { result.push({ ...run, x, y, width: widths[index]! }); x += widths[index]!; }); top += line.height;
  }
  return result;
}
