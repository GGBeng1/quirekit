import { composeWordStyleText } from "@quirekit/classic-styles-model";
import type { WordTableUnknownRecord } from "../../types";
import type {
  WordTableStyleCellPatch,
  WordTableStyleFormatting,
  WordTableStyleRowPatch,
  WordTableStyleTablePatch
} from "../types";

/** Formatting group that contributes nothing. */
export const emptyWordTableStyleFormatting: WordTableStyleFormatting = Object.freeze({
  table: null,
  row: null,
  cell: null,
  paragraph: null,
  text: null
});

/**
 * Applies one later formatting group over an earlier one.
 *
 * Border and margin maps merge per side, paragraph and text deltas merge per
 * nested field, and every other property is replaced by the later value.
 *
 * @param earlier - Accumulated formatting.
 * @param later - Formatting that wins where it declares a value.
 * @returns Merged formatting.
 */
export function mergeWordTableStyleFormatting(
  earlier: WordTableStyleFormatting,
  later: WordTableStyleFormatting
): WordTableStyleFormatting {
  return {
    table: mergeTablePatch(earlier.table, later.table),
    row: mergeFlat(earlier.row, later.row),
    cell: mergeCellPatch(earlier.cell, later.cell),
    paragraph: mergeUnknownRecord(earlier.paragraph, later.paragraph),
    text: earlier.text === null ? later.text : later.text === null ? earlier.text
      : composeWordStyleText(earlier.text, later.text) as WordTableUnknownRecord
  };
}

/**
 * Merges table patches with per-side borders and margins.
 *
 * @param earlier - Accumulated patch.
 * @param later - Winning patch.
 * @returns Merged patch or null.
 */
function mergeTablePatch(
  earlier: WordTableStyleTablePatch | null,
  later: WordTableStyleTablePatch | null
): WordTableStyleTablePatch | null {
  const merged = mergeFlat(earlier, later);
  if (merged === null || earlier === null || later === null) return merged;
  return withSideMaps(merged, earlier, later);
}

/**
 * Merges cell patches with per-side borders and margins.
 *
 * @param earlier - Accumulated patch.
 * @param later - Winning patch.
 * @returns Merged patch or null.
 */
function mergeCellPatch(
  earlier: WordTableStyleCellPatch | null,
  later: WordTableStyleCellPatch | null
): WordTableStyleCellPatch | null {
  const merged = mergeFlat(earlier, later);
  if (merged === null || earlier === null || later === null) return merged;
  return withSideMaps(merged, earlier, later);
}

/**
 * Replaces the flat-merged border and margin maps with per-side merges.
 *
 * @param merged - Flat merge result.
 * @param earlier - Accumulated patch.
 * @param later - Winning patch.
 * @returns Patch whose side maps inherit omitted sides.
 */
function withSideMaps<T extends WordTableStyleTablePatch | WordTableStyleCellPatch>(
  merged: T,
  earlier: T,
  later: T
): T {
  const borders = earlier.borders === undefined || later.borders === undefined
    ? merged.borders
    : { ...earlier.borders, ...later.borders };
  const cellMargins = earlier.cellMargins === undefined || later.cellMargins === undefined
    ? merged.cellMargins
    : { ...earlier.cellMargins, ...later.cellMargins };
  return {
    ...merged,
    ...(borders === undefined ? {} : { borders }),
    ...(cellMargins === undefined ? {} : { cellMargins })
  };
}

/**
 * Shallow-merges two optional patches.
 *
 * @param earlier - Accumulated patch.
 * @param later - Winning patch.
 * @returns Merged patch, or null when both are absent.
 */
function mergeFlat<T extends WordTableStyleRowPatch | WordTableStyleTablePatch | WordTableStyleCellPatch>(
  earlier: T | null,
  later: T | null
): T | null {
  if (earlier === null) return later;
  if (later === null) return earlier;
  return { ...earlier, ...later };
}

/**
 * Deep-merges plain-object deltas; arrays and scalars are replaced. A null or
 * undefined field means "inherit" in the Word Styles patch vocabulary.
 *
 * @param earlier - Accumulated delta.
 * @param later - Winning delta.
 * @returns Merged delta, or null when both are absent.
 */
export function mergeUnknownRecord(
  earlier: WordTableUnknownRecord | null,
  later: WordTableUnknownRecord | null
): WordTableUnknownRecord | null {
  if (earlier === null) return later;
  if (later === null) return earlier;
  const result: Record<string, unknown> = { ...earlier };
  for (const [key, value] of Object.entries(later)) {
    if (value === null || value === undefined) continue;
    const previous = result[key];
    result[key] = isPlainRecord(previous) && isPlainRecord(value)
      ? mergeUnknownRecord(previous, value)
      : value;
  }
  return result;
}

/**
 * Checks for a non-array object.
 *
 * @param value - Candidate value.
 * @returns Whether the value is a plain record.
 */
function isPlainRecord(value: unknown): value is WordTableUnknownRecord {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}
