import {
  Slice,
  type Transaction
} from "@quirekit/pm";
import { pasteWordTableSelection } from "../clipboard/paste/replace";
import type { WordTableSelection } from "./selection";
import type { WordTableSelectionCreateOptions } from "./types";

/**
 * Replaces table content while retaining structural delete/paste semantics.
 *
 * @param selection - Structural table selection to replace.
 * @param transaction - Transaction receiving replacement steps.
 * @param content - Replacement content.
 * @returns Fresh selection options, a handled flag, or false for generic replacement.
 */
export function replaceWordTableSelection(
  selection: WordTableSelection,
  transaction: Transaction,
  content: Slice
): boolean | WordTableSelectionCreateOptions {
  return content === Slice.empty
    ? clearWordTableSelection(selection, transaction)
    : pasteWordTableSelection(selection, transaction, content);
}

/**
 * Clears selected semantic cell contents while preserving table structure.
 *
 * @param selection - Structural table selection to clear.
 * @param transaction - Transaction receiving replacement steps.
 * @returns Whether the clear operation succeeded.
 */
function clearWordTableSelection(
  selection: WordTableSelection,
  transaction: Transaction
): boolean {
  const paragraph = transaction.doc.type.schema.nodes.paragraph?.createAndFill();

  if (!paragraph) {
    return false;
  }

  for (const cell of selection.cells) {
    const cellPos = transaction.mapping.map(
      selection.tablePos + cell.originCellPos,
      1
    );
    const cellNode = transaction.doc.nodeAt(cellPos);

    if (!cellNode || cellNode.type.name !== "wordTableCell") {
      return false;
    }

    transaction.replaceWith(
      cellPos + 1,
      cellPos + cellNode.nodeSize - 1,
      paragraph
    );
  }

  transaction.setSelection(selection.map(transaction.doc, transaction.mapping));

  return true;
}
