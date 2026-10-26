import type { RunGrapheme } from "../units";
import type { CharacterGridGeometry } from "./types";
import { characterCellWidth, sameCharacterBlock } from "./meter";

/**
 * Allocates a completed physical slot; source styles never manufacture extra cells.
 * @param graphemes - Measured graphemes assigned by the wrapping authority.
 * @returns Shared caret advances, physical ink offsets, and native paint grouping.
 */
export function resolveCharacterGridGeometry(graphemes: readonly RunGrapheme[]): CharacterGridGeometry {
  const advances = graphemes.map(item => item.tabAdvance ?? item.replacementInlineSize ?? item.naturalAdvance ?? 0);
  const paintOffsets = advances.map(() => 0), groups = advances.map(() => 0);
  let group = 0;
  // First reserve natural text inside cells. Padding belongs to the visual edges,
  // while required shaping and document offsets remain unchanged inside a block.
  for (let start = 0; start < graphemes.length;) {
    const first = graphemes[start]!;
    const grid = first.tabAdvance === undefined && first.replacementInlineSize === undefined && first.text !== "\t"
      ? first.characterGrid : undefined;
    let end = start + 1, natural = advances[start]!;
    while (end < graphemes.length && sameCharacterBlock(grid, graphemes[end]!.characterGrid)
      && (graphemes[end]!.level ?? 0) === (first.level ?? 0)
      && !graphemes[end]!.spacingBefore && graphemes[end]!.tabAdvance === undefined
      && graphemes[end]!.replacementInlineSize === undefined && graphemes[end]!.text !== "\t") {
      natural += advances[end]!; end++;
    }
    if (grid?.mode === "spacing") advances[start] = Math.max(0, natural + grid.spacing);
    if (grid?.mode === "cells") {
      const padding = characterCellWidth(natural, grid.pitch) - natural;
      const rtl = (first.level ?? 0) % 2 === 1;
      const left = rtl ? end - 1 : start, right = rtl ? start : end - 1;
      const leading = grid.align === "center" ? padding / 2 : rtl ? padding : 0;
      advances[left] = advances[left]! + leading;
      advances[right] = advances[right]! + padding - leading;
      paintOffsets[left] = leading;
    }
    for (let index = start; index < end; index++) groups[index] = group;
    group++; start = end;
  }
  // Same-slot automatic gaps stay outside cell rounding and belong to the
  // preceding caret advance, exactly as in ordinary paragraph layout.
  for (let index = 1; index < graphemes.length; index++) {
    advances[index - 1] = advances[index - 1]! + (graphemes[index]!.spacingBefore ?? 0);
  }
  return { advances, paintOffsets, groups };
}
