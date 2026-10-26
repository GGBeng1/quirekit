import type { RunGrapheme } from "../units";
import type { CharacterGridMeter, QuireTextCharacterGrid } from "./types";

/** @returns An empty physical-slot meter with no pending text block. */
export function createCharacterGridMeter(): CharacterGridMeter {
  return { width: 0, tolerance: 0, natural: 0, grid: undefined, level: 0 };
}

/**
 * Quantizes a natural advance without promoting floating-point dust to a new cell.
 * @param natural - Non-negative measured width.
 * @param pitch - Positive grid pitch.
 * @returns Width of the smallest containing positive integral cell span.
 */
export function characterCellWidth(natural: number, pitch: number): number {
  return Math.max(1, Math.ceil(natural / pitch - 1e-9)) * pitch;
}

/**
 * Determines whether text continues one cell block across a source-style boundary.
 * @param previous - Prior block's resolved policy.
 * @param current - Candidate's resolved policy.
 * @returns Whether both policies allocate the same kind of text block.
 */
export function sameCharacterBlock(previous: QuireTextCharacterGrid | undefined, current: QuireTextCharacterGrid | undefined): boolean {
  return previous?.mode === "cells" && current?.mode === "cells"
    && previous.unit === "block" && current.unit === "block"
    && previous.pitch === current.pitch && previous.align === current.align
    && previous.roundingError === current.roundingError;
}

/**
 * Accumulates one candidate using exactly the rounding applied during final placement.
 * @param meter - Mutable slot state; speculative callers pass a shallow copy.
 * @param graphemes - Already measured source graphemes.
 * @returns Additional occupied width, which may be zero inside a reserved cell.
 */
export function appendCharacterGrid(meter: CharacterGridMeter, graphemes: readonly RunGrapheme[]): number {
  const before = meter.width;
  for (const grapheme of graphemes) {
    const fixed = grapheme.tabAdvance ?? grapheme.replacementInlineSize;
    const natural = fixed ?? grapheme.naturalAdvance ?? 0;
    const gap = meter.width === 0 ? 0 : grapheme.spacingBefore ?? 0;
    const grid = fixed === undefined && !/[\n\r\t]/u.test(grapheme.text) ? grapheme.characterGrid : undefined;
    const joins = gap === 0 && sameCharacterBlock(meter.grid, grid) && meter.level === (grapheme.level ?? 0);
    meter.width += gap;
    if (grid?.mode === "cells") {
      const old = joins ? characterCellWidth(meter.natural, grid.pitch) : 0;
      meter.natural = (joins ? meter.natural : 0) + natural;
      const additional = characterCellWidth(meter.natural, grid.pitch) - old;
      meter.width += additional;
      meter.tolerance += additional / grid.pitch * (grid.roundingError ?? 0);
    } else {
      meter.width += grid?.mode === "spacing" ? Math.max(0, natural + grid.spacing) : natural;
      if (grid?.mode === "spacing") meter.tolerance += grid.roundingError ?? 0;
      meter.natural = 0;
    }
    meter.grid = grid;
    meter.level = grapheme.level ?? 0;
  }
  return meter.width - before;
}

/**
 * Measures a candidate independently of any preceding physical slot.
 * @param graphemes - Measured candidate graphemes.
 * @returns Candidate width with a dropped leading automatic gap.
 */
export function measureCharacterGrid(graphemes: readonly RunGrapheme[]): number {
  const meter = createCharacterGridMeter();
  appendCharacterGrid(meter, graphemes);
  return meter.width;
}
