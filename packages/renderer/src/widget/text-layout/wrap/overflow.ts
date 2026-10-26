import type { ShapedRunData } from "../shaping";
import type { RunGrapheme } from "../units";
import type { QuireTextLayoutOptions } from "../types";
import type { TextWrapState } from "./types";
import { forbidsPunctuationBreak } from "../break/punctuation";
import { adjustGraphemeAdvance, readMeasuredAdvance, shapedAdvanceOf } from "./advances";
import { measureCharacterGrid } from "../character-grid/meter";

/**
 * Fits an overlong word while retaining any punctuation group that fits a full row.
 * The two linear passes retain source anchors and guarantee progress at width zero.
 * @param graphemes - Original source graphemes, never resegmented or rewritten.
 * @param state - Shared slot packing authority.
 * @param maxWidth - Full row extent in CSS pixels.
 * @param measureText - Fallback measure authority.
 * @param shapedData - Previously resolved advances.
 * @param avoidPunctuationBreaks - Whether adjacent punctuation protects a boundary.
 */
export function appendOverlongText(
  graphemes: readonly RunGrapheme[],
  state: TextWrapState,
  maxWidth: number,
  measureText: QuireTextLayoutOptions["measureText"],
  shapedData: ReadonlyMap<number, ShapedRunData>,
  avoidPunctuationBreaks: boolean
): void {
  const grid = graphemes[0]?.naturalAdvance !== undefined;
  const widths = graphemes.map(grapheme => (grapheme.naturalAdvance ?? adjustGraphemeAdvance(
    grapheme.replacementInlineSize ?? shapedAdvanceOf(grapheme, shapedData)
      ?? readMeasuredAdvance(measureText(grapheme.text, grapheme.font).width, "grapheme"),
    grapheme
  )) + (grapheme.spacingBefore ?? 0));
  // Word boundaries may relax, but the smallest punctuation groups remain intact
  // while they fit. An impossible group relaxes once, without searching later rows.
  for (let start = 0; start < graphemes.length;) {
    let end = start + 1;
    let width = widths[start]!;
    while (avoidPunctuationBreaks && end < graphemes.length
      && forbidsPunctuationBreak(graphemes[end - 1]!.text, graphemes[end]!.text)) {
      width += widths[end]!;
      end++;
    }
    const leading = graphemes[start]!.spacingBefore ?? 0;
    const candidate = graphemes.slice(start, end);
    if (grid) width = measureCharacterGrid(candidate) + leading;
    if (width - leading <= maxWidth) {
      state.seek(width, false, leading, grid ? candidate : undefined);
      state.append(candidate, width);
    } else {
      for (let index = start; index < end; index++) {
        state.seek(widths[index]!, true, graphemes[index]!.spacingBefore, grid ? [graphemes[index]!] : undefined);
        state.append([graphemes[index]!], widths[index]!);
      }
    }
    start = end;
  }
}
