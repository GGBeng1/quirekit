import {
  createWordTableSelectionHtmlSlice,
  createWordTableSelectionSlice
} from "./slice";
import { serializeWordTableSelectionTsv } from "./tsv";
import type {
  WordTableClipboardData,
  WordTableSelectionClipboardOptions
} from "./types";

export { parseWordTableTsv } from "./tsv";

/**
 * Serializes a structural Word table selection into clipboard-ready formats.
 *
 * @param selectionOrOptions - Structural selection or explicit options object.
 * @returns Internal slice, static-display HTML slice, and TSV fallback.
 */
export function serializeWordTableSelection(
  selectionOrOptions: WordTableSelectionClipboardOptions["selection"] |
    WordTableSelectionClipboardOptions
): WordTableClipboardData {
  const selection = "selection" in selectionOrOptions
    ? selectionOrOptions.selection
    : selectionOrOptions;

  return {
    slice: createWordTableSelectionSlice(selection),
    htmlSlice: createWordTableSelectionHtmlSlice(selection),
    tsv: serializeWordTableSelectionTsv(selection)
  };
}
