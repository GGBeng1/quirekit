import type {
  WordTableSelectionJSON,
  WordTableSelectionMode
} from "./types";

/** JSON id used by ProseMirror to restore Word table selections. */
export const WORD_TABLE_SELECTION_JSON_ID = "wordTable";

/**
 * Reads a Word table selection JSON payload.
 *
 * @param json - Unknown serialized payload.
 * @returns Parsed Word table selection JSON.
 */
export function readWordTableSelectionJSON(
  json: unknown
): WordTableSelectionJSON {
  if (!json || typeof json !== "object") {
    throw new RangeError("Invalid input for WordTableSelection.fromJSON");
  }

  const payload = json as Partial<WordTableSelectionJSON>;

  if (
    payload.type !== WORD_TABLE_SELECTION_JSON_ID ||
    typeof payload.tablePos !== "number" ||
    typeof payload.anchorCellPos !== "number" ||
    typeof payload.headCellPos !== "number"
  ) {
    throw new RangeError("Invalid input for WordTableSelection.fromJSON");
  }

  return {
    type: WORD_TABLE_SELECTION_JSON_ID,
    tablePos: payload.tablePos,
    anchorCellPos: payload.anchorCellPos,
    headCellPos: payload.headCellPos,
    mode: readSelectionMode(payload.mode)
  };
}

/**
 * Reads a serialized Word table selection mode.
 *
 * @param value - Unknown serialized mode.
 * @returns Parsed selection mode.
 */
function readSelectionMode(value: unknown): WordTableSelectionMode {
  if (
    value === "cell" ||
    value === "row" ||
    value === "column" ||
    value === "table"
  ) {
    return value;
  }

  throw new RangeError("Invalid input for WordTableSelection.fromJSON");
}
