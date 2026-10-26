import type { Node as PMNode } from "@quirekit/pm";
import type {
  DeleteWordTableOptions,
  WordTableCommandResult,
  WordTableMaybeDeleted
} from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "../types";

/**
 * Deletes one logical Word table without routing through row deletion.
 *
 * @param tableNode - Source node expected to be a Word table.
 * @param _options - Reserved delete-table options.
 * @returns Command result containing the table-deleted sentinel.
 */
export function deleteWordTable(
  tableNode: PMNode,
  _options: DeleteWordTableOptions
): WordTableCommandResult<WordTableMaybeDeleted> {
  if (tableNode.type.name !== "wordTable") {
    return wordTableCommandFailure("no-table");
  }

  return wordTableCommandSuccess(null);
}
