import type { Selection } from "@quirekit/pm";
import type { QuireTableCellSelection } from "../../document-profile/types";

/**
 * Reads a selection as a table cell selection when it satisfies the structural protocol.
 *
 * @param selection - Active ProseMirror selection.
 * @returns The selection typed as a cell selection, or null for any other selection.
 */
export function readQuireTableCellSelection(selection: Selection): (Selection & QuireTableCellSelection) | null {
  const candidate = selection as Selection & Partial<QuireTableCellSelection>;
  return typeof candidate.tablePos === "number" && Array.isArray(candidate.cells) ? candidate as Selection & QuireTableCellSelection : null;
}
