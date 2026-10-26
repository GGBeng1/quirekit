import type { QuireTextLayoutOptions } from "../types";
import type { BreakUnit } from "../units";
import type { ShapedRunData } from "../shaping";
import { adjustGraphemeAdvance, readMeasuredAdvance, shapedAdvanceOf } from "../wrap/advances";

/**
 * Resolves natural advances once before grid wrapping; painting reuses these values.
 * @param units - Existing break units, including automatic boundary gaps.
 * @param options - Existing measure and native advance authorities.
 * @param shaped - Already computed shaping output; this function never shapes.
 * @returns Measured copies only when at least one run has a character grid.
 */
export function measureCharacterGridUnits(
  units: readonly BreakUnit[], options: QuireTextLayoutOptions,
  shaped: ReadonlyMap<number, ShapedRunData>
): readonly BreakUnit[] {
  if (!options.runs.some(run => run.characterGrid !== undefined)) return units;
  for (const run of options.runs) {
    const grid = run.characterGrid;
    if (grid && (!Number.isFinite(grid.pitch) || grid.pitch <= 0 || !Number.isFinite(grid.spacing)
      || !Number.isFinite(grid.roundingError ?? 0) || (grid.roundingError ?? 0) < 0)) {
      throw new RangeError("Character grid requires a positive pitch, finite spacing and non-negative rounding error.");
    }
  }
  const cache = new Map<string, Map<string, number>>();
  /** @param text - Native segment. @param font - Font authority. @returns Cached natural width. */
  const measure = (text: string, font: string): number => {
    let byText = cache.get(font);
    if (!byText) cache.set(font, byText = new Map());
    let width = byText.get(text);
    if (width === undefined) {
      width = readMeasuredAdvance(options.measureText(text, font).width, "grid segment");
      byText.set(text, width);
    }
    return width;
  };
  return units.map(unit => {
    // Native word prefixes retain kerning inside the same break unit. Independent
    // grid cells paint separately, so their measurement cannot accumulate a paragraph.
    let prefix = "", prefixWidth = 0;
    const graphemes = unit.graphemes.map(grapheme => {
      const fixed = grapheme.replacementInlineSize;
      let natural = fixed;
      if (natural === undefined) {
        let measured = shapedAdvanceOf(grapheme, shaped);
        if (measured === undefined && (options.nativeAdvanceMode === "grapheme"
          || grapheme.characterGrid?.unit === "grapheme")) {
          measured = measure(grapheme.text, grapheme.font);
        }
        if (measured === undefined) {
          prefix += grapheme.text;
          const next = measure(prefix, grapheme.font);
          measured = next - prefixWidth;
          prefixWidth = next;
        }
        natural = adjustGraphemeAdvance(measured, grapheme);
      }
      return { ...grapheme, naturalAdvance: natural };
    });
    return { ...unit, graphemes };
  });
}
