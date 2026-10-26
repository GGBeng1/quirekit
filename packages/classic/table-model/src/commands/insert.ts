import type { QuireJSONContent } from "@quirekit/core";
import type { Node as PMNode, Schema } from "@quirekit/pm";
import { createWordTableRowJSON } from "./derive/json/builder";
import { getWordTableCommandNodeTypes } from "./derive/node/builder";
import type {
  CreateWordTableOptions,
  WordTableCommandResult
} from "./types";
import type { WordTableBorder, WordTableBorders } from "../types";
import {
  wordTableCommandFailure,
  wordTableCommandSuccess
} from "./types";

/**
 * Semantic preset applied to tables authored through the editor.
 *
 * Physical grid widths remain unresolved until an export or layout authority
 * knows the containing width. Consumer-supplied attrs may override every field.
 */
/** Default half-point black border authored for a fresh TableGrid table. */
export const freshWordTableBorder: WordTableBorder = Object.freeze({
  style: "single",
  size: 4,
  color: "auto",
  space: 0,
  shadow: false,
  frame: false
});

/** Complete outside and inside border tuple authored for a fresh TableGrid table. */
export const freshWordTableBorders: WordTableBorders = Object.freeze({
  top: freshWordTableBorder,
  right: freshWordTableBorder,
  bottom: freshWordTableBorder,
  left: freshWordTableBorder,
  insideH: freshWordTableBorder,
  insideV: freshWordTableBorder,
  tl2br: null,
  tr2bl: null
});

export const freshWordTablePreset = {
  tableStyle: "TableGrid",
  width: { value: 5000, unit: "pct" },
  tableLayout: "autofit",
  borders: freshWordTableBorders
} as const;

/**
 * Creates Word table JSON content.
 *
 * @param options - Table creation options.
 * @returns Command result containing table JSON.
 */
export function createWordTableJSON(
  options: CreateWordTableOptions
): WordTableCommandResult<QuireJSONContent> {
  if (options.rowCount <= 0 || options.columnCount <= 0) {
    return wordTableCommandFailure("empty-result");
  }
  if (options.cellContent !== undefined && options.cellContents !== undefined) {
    return wordTableCommandFailure("invalid-content");
  }
  if (options.cellContents !== undefined
    && options.cellContents.length !== options.rowCount * options.columnCount) {
    return wordTableCommandFailure("invalid-content");
  }

  const tableAttrs = {
    ...freshWordTablePreset,
    grid: Array.from({ length: options.columnCount }, () => ({ width: null })),
    ...options.tableAttrs
  };

  return wordTableCommandSuccess({
    type: "wordTable",
    attrs: tableAttrs,
    content: Array.from({ length: options.rowCount }, (_, rowIndex) =>
      createWordTableRowJSON(
        options.columnCount,
        options.rowAttrs,
        options.cellAttrs,
        options.cellContent,
        options.cellContents?.slice(
          rowIndex * options.columnCount,
          (rowIndex + 1) * options.columnCount
        )
      )
    )
  });
}

/**
 * Creates a Word table ProseMirror node.
 *
 * @param schema - Schema containing Word table nodes.
 * @param options - Table creation options.
 * @returns Command result containing a table node.
 */
export function createWordTableNode(
  schema: Schema,
  options: CreateWordTableOptions
): WordTableCommandResult<PMNode> {
  const jsonResult = createWordTableJSON(options);

  if (!jsonResult.ok) {
    return jsonResult;
  }

  getWordTableCommandNodeTypes(schema);

  return wordTableCommandSuccess(schema.nodeFromJSON(jsonResult.value));
}
