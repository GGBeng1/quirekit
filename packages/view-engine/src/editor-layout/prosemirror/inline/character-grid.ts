import type { QuireCharacterGrid, QuireTextCharacterGrid } from "@quirekit/renderer";
import type { QuireDocumentFontSlot } from "../document-font-theme";

/**
 * Resolves a neutral container constraint against already itemized script ownership.
 * @param grid - Inherited container geometry, absent for ordinary text.
 * @param participates - Effective inherited-to-direct text switch.
 * @param slot - Script slot selected by the document's font authority.
 * @returns Run allocation without document tokens, source edits, or font scaling.
 */
export function resolveInlineCharacterGrid(
  grid: QuireCharacterGrid | null | undefined, participates: boolean | undefined,
  slot: QuireDocumentFontSlot | undefined
): QuireTextCharacterGrid | undefined {
  if (!grid || (grid.mode === "spacing" && participates === false)) return undefined;
  return { ...grid, unit: grid.mode === "spacing" || (slot === "eastAsia" && participates !== false)
    ? "grapheme" : "block", align: slot === "complexScript" ? "start" : "center" };
}
