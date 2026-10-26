import { defineCommand, type AnyCommands } from "@quirekit/core";
import { addWordTableColumns } from "../compound";
import {
  addWordTableColumn,
  deleteWordTableColumns,
  moveWordTableColumns
} from "../column";
import {
  setWordTableColumnWidth
} from "../formatting";
import { selectInsertedWordTableColumn } from "../derive/editor/selection/after/insert";
import { selectMovedWordTableColumns } from "../derive/editor/selection/after/move";
import { withSelectedColumnRange } from "../derive/editor/selection/options";
import { createTableTransformCommand } from "../derive/editor/transform";
import { createWordTableDistributionCommand } from "./distribution";
import type {
  AddWordTableColumnCommandOptions,
  AddWordTableColumnsCommandOptions,
  DeleteWordTableColumnsCommandOptions,
  MoveWordTableColumnsCommandOptions,
  SetWordTableColumnWidthCommandOptions
} from "../types";

/**
 * Creates editor commands owned by the Word table column family.
 *
 * @returns Editor command map for grid-column operations.
 */
export function createWordTableColumnEditorCommands(): AnyCommands {
  return {
    addWordTableColumn:
      createTableTransformCommand<AddWordTableColumnCommandOptions>(
        addWordTableColumn,
        undefined,
        { resolveSelectionAfterTransform: selectInsertedWordTableColumn, granularity: "minimal" }
      ),
    addWordTableColumns:
      createTableTransformCommand<AddWordTableColumnsCommandOptions>(
        addWordTableColumns,
        undefined,
        { resolveSelectionAfterTransform: selectInsertedWordTableColumn, granularity: "minimal" }
      ),
    deleteWordTableColumns:
      createTableTransformCommand<DeleteWordTableColumnsCommandOptions>(
        deleteWordTableColumns,
        withSelectedColumnRange,
        { granularity: "minimal" }
      ),
    moveWordTableColumns: defineCommand({
      description: "Moves a range of grid columns of the table, with their content and widths, before another column or to the end.",
      target: "block",
      nodes: ["wordTable"],
      ordinals: ["from", "to", "targetIndex"],
      params: {
        type: "object",
        required: ["from", "targetIndex"],
        properties: {
          from: { type: "integer", minimum: 1, description: "First column to move, counted from 1." },
          to: { type: "integer", minimum: 1, description: "Last column to move, inclusive; default from." },
          targetIndex: { type: "integer", minimum: 1, description: "Move before this column of the current table, counted from 1; the column count plus 1 moves to the end." }
        },
        additionalProperties: false
      },
      run: createTableTransformCommand<MoveWordTableColumnsCommandOptions>(
        moveWordTableColumns,
        undefined,
        { resolveSelectionAfterTransform: selectMovedWordTableColumns }
      )
    }),
    distributeWordTableColumns: createWordTableDistributionCommand("column"),
    setWordTableColumnWidth:
      createTableTransformCommand<SetWordTableColumnWidthCommandOptions>(
        setWordTableColumnWidth,
        undefined,
        { preserveSelectionWithinTable: true, scrollIntoView: false }
      )
  };
}
