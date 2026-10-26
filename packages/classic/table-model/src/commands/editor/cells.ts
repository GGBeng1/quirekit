import { defineCommand, type AnyCommands } from "@quirekit/core";
import { addWordTableCell, deleteWordTableCell } from "../cell";
import { clearWordTableCellContents } from "../compound";
import {
  clearWordTableCellFormatting,
  setWordTableCellAttrs,
  setWordTableCellBorders,
  setWordTableCellBorderColor,
  setWordTableCellBorderFormat,
  setWordTableCellMargin
} from "../formatting";
import { mergeWordTableCells } from "../merge";
import { splitWordTableCell } from "../split";
import {
  withSelectedSingleCell,
  withSelectedTableRect
} from "../derive/editor/selection/options";
import { createTableTransformCommand } from "../derive/editor/transform";
import { selectMergedWordTableCell, selectSplitWordTableCells } from "../derive/editor/selection/after/merge-split";
import type {
  AddWordTableCellCommandOptions,
  ClearWordTableCellContentsCommandOptions,
  ClearWordTableCellFormattingCommandOptions,
  DeleteWordTableCellCommandOptions,
  MergeWordTableCellsCommandOptions,
  SetWordTableCellAttrsCommandOptions,
  SetWordTableCellBordersCommandOptions,
  SetWordTableCellBorderColorCommandOptions,
  SetWordTableCellBorderFormatCommandOptions,
  SetWordTableCellMarginCommandOptions,
  SplitWordTableCellCommandOptions
} from "../types";

/**
 * Creates editor commands owned by the Word table cell family.
 *
 * @returns Editor command map for cell content, structure, and formatting.
 */
export function createWordTableCellEditorCommands(): AnyCommands {
  return {
    clearWordTableCellContents: defineCommand({
      description: "Empties the cells of a rectangle of the table, keeping the rows, columns and cell formatting; use it to clear cells before refilling them.",
      target: "block",
      nodes: ["wordTable"],
      ordinals: ["startRow", "startColumn"],
      params: {
        type: "object",
        required: ["startRow", "startColumn", "rowSpan", "columnSpan"],
        properties: {
          startRow: { type: "integer", minimum: 1, description: "First row, counted from 1." },
          startColumn: { type: "integer", minimum: 1, description: "First grid column, counted from 1." },
          rowSpan: { type: "integer", minimum: 1, description: "Number of rows." },
          columnSpan: { type: "integer", minimum: 1, description: "Number of grid columns." }
        },
        additionalProperties: false
      },
      run: createTableTransformCommand<ClearWordTableCellContentsCommandOptions>(
        clearWordTableCellContents,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      )
    }),
    addWordTableCell:
      createTableTransformCommand<AddWordTableCellCommandOptions>(
        addWordTableCell,
        undefined,
        { preserveSelectionWithinTable: true }
      ),
    deleteWordTableCell:
      createTableTransformCommand<DeleteWordTableCellCommandOptions>(
        deleteWordTableCell,
        undefined,
        { preserveSelectionWithinTable: true }
      ),
    setWordTableCellAttrs:
      createTableTransformCommand<SetWordTableCellAttrsCommandOptions>(
        setWordTableCellAttrs,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    setWordTableCellMargin:
      createTableTransformCommand<SetWordTableCellMarginCommandOptions>(
        setWordTableCellMargin,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    setWordTableCellBorders:
      createTableTransformCommand<SetWordTableCellBordersCommandOptions>(
        setWordTableCellBorders,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    setWordTableCellBorderColor:
      createTableTransformCommand<SetWordTableCellBorderColorCommandOptions>(
        setWordTableCellBorderColor,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    setWordTableCellBorderFormat:
      createTableTransformCommand<SetWordTableCellBorderFormatCommandOptions>(
        setWordTableCellBorderFormat,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    clearWordTableCellFormatting:
      createTableTransformCommand<ClearWordTableCellFormattingCommandOptions>(
        clearWordTableCellFormatting,
        withSelectedTableRect,
        { preserveSelectionWithinTable: true }
      ),
    mergeWordTableCells:
      createTableTransformCommand<MergeWordTableCellsCommandOptions>(
        mergeWordTableCells,
        withSelectedTableRect,
        { resolveSelectionAfterTransform: selectMergedWordTableCell }
      ),
    splitWordTableCell:
      createTableTransformCommand<SplitWordTableCellCommandOptions>(
        splitWordTableCell,
        withSelectedSingleCell,
        { resolveSelectionAfterTransform: selectSplitWordTableCells }
      )
  };
}
