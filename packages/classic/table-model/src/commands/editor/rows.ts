import { defineCommand, type AnyCommands } from "@quirekit/core";
import { addWordTableRows } from "../compound";
import {
  setWordTableRowAttrs,
  setWordTableRowHeight
} from "../formatting";
import { addWordTableRow, deleteWordTableRows, moveWordTableRows } from "../row";
import type {
  AddWordTableRowCommandOptions,
  AddWordTableRowsCommandOptions,
  DeleteWordTableRowsCommandOptions,
  MoveWordTableRowsCommandOptions,
  SetWordTableRowAttrsCommandOptions,
  SetWordTableRowHeightCommandOptions
} from "../types";
import { selectInsertedWordTableRow } from "../derive/editor/selection/after/insert";
import { selectMovedWordTableRows } from "../derive/editor/selection/after/move";
import { withSelectedRowRange } from "../derive/editor/selection/options";
import { createTableTransformCommand } from "../derive/editor/transform";
import { createWordTableDistributionCommand } from "./distribution";

/**
 * Creates editor commands owned by the Word table row family.
 *
 * @returns Editor command map for row operations.
 */
export function createWordTableRowEditorCommands(): AnyCommands {
  return {
    addWordTableRow:
      createTableTransformCommand<AddWordTableRowCommandOptions>(
        addWordTableRow,
        undefined,
        { resolveSelectionAfterTransform: selectInsertedWordTableRow, granularity: "minimal" }
      ),
    addWordTableRows:
      createTableTransformCommand<AddWordTableRowsCommandOptions>(
        addWordTableRows,
        undefined,
        { resolveSelectionAfterTransform: selectInsertedWordTableRow, granularity: "minimal" }
      ),
    deleteWordTableRows:
      createTableTransformCommand<DeleteWordTableRowsCommandOptions>(
        deleteWordTableRows,
        withSelectedRowRange,
        { granularity: "minimal" }
      ),
    moveWordTableRows: defineCommand({
      description: "Moves a range of rows of the table, with their content and formatting, before another row or to the end.",
      target: "block",
      nodes: ["wordTable"],
      ordinals: ["from", "to", "targetIndex"],
      params: {
        type: "object",
        required: ["from", "targetIndex"],
        properties: {
          from: { type: "integer", minimum: 1, description: "First row to move, counted from 1." },
          to: { type: "integer", minimum: 1, description: "Last row to move, inclusive; default from." },
          targetIndex: { type: "integer", minimum: 1, description: "Move before this row of the current table, counted from 1; the row count plus 1 moves to the end." }
        },
        additionalProperties: false
      },
      run: createTableTransformCommand<MoveWordTableRowsCommandOptions>(
        moveWordTableRows,
        undefined,
        { resolveSelectionAfterTransform: selectMovedWordTableRows }
      )
    }),
    distributeWordTableRows: createWordTableDistributionCommand("row"),
    setWordTableRowHeight:
      createTableTransformCommand<SetWordTableRowHeightCommandOptions>(
        setWordTableRowHeight,
        undefined,
        { preserveSelectionWithinTable: true, scrollIntoView: false }
      ),
    setWordTableRowAttrs:
      createTableTransformCommand<SetWordTableRowAttrsCommandOptions>(
        setWordTableRowAttrs,
        undefined,
        { preserveSelectionWithinTable: true }
      )
  };
}
