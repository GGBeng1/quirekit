import type { WordTableSelectionCreateOptions } from "../../selection";
import type { ApplyWordTableStyleOptions, SetWordTableLookOptions } from "../../style";
import type { WordTableEditorLocateOptions } from "../types";
import type { PasteWordTableMatrixCommandOptions } from "../matrix";
import type { WordTableCellTraversalDirection } from "./navigation";
import type {
  AddWordTableCellCommandOptions,
  AddWordTableColumnsCommandOptions,
  AddWordTableColumnCommandOptions,
  AddWordTableRowsCommandOptions,
  AddWordTableRowCommandOptions,
  ClearWordTableCellContentsCommandOptions,
  ClearWordTableCellFormattingCommandOptions,
  DeleteWordTableCellCommandOptions,
  DeleteWordTableColumnsCommandOptions,
  DeleteWordTableCommandOptions,
  DeleteWordTableRowsCommandOptions,
  DistributeWordTableColumnsCommandOptions,
  DistributeWordTableRowsCommandOptions,
  InsertWordTableCommandOptions,
  MergeWordTableCellsCommandOptions,
  MoveWordTableColumnsCommandOptions,
  MoveWordTableRowsCommandOptions,
  RepairWordTableCommandOptions,
  SetWordTableAttrsCommandOptions,
  SetWordTableCellAttrsCommandOptions,
  SetWordTableCellBordersCommandOptions,
  SetWordTableCellBorderColorCommandOptions,
  SetWordTableCellBorderFormatCommandOptions,
  SetWordTableCellMarginCommandOptions,
  SetWordTableColumnWidthCommandOptions,
  SetWordTableRowAttrsCommandOptions,
  SetWordTableRowHeightCommandOptions,
  SplitWordTableCellCommandOptions
} from "../types";

/** Coordinates supplied automatically by a rectangular table selection. */
export type TableRectCoordinate =
  | "startRow"
  | "startColumn"
  | "rowSpan"
  | "columnSpan";

/** Public options whose structural coordinates may come from the selection. */
export type SelectionBackedCommandOptions<
  Options,
  Coordinates extends keyof Options
> = Omit<Options, Coordinates> & Partial<Pick<Options, Coordinates>>;

/** Public Word table command methods installed on the editor. */
export interface WordTableCommandMethods<ReturnType> {
  /** Creates one canonical structural Table selection. */
  setWordTableSelection(options: WordTableSelectionCreateOptions): ReturnType;
  /** Moves to the next or previous cell like Tab, appending a row after the last cell. */
  moveToWordTableCell(direction: WordTableCellTraversalDirection): ReturnType;
  /** Inserts a new logical Word table. */
  insertWordTable(options: InsertWordTableCommandOptions): ReturnType;
  /** Deletes one complete logical Word table. */
  deleteWordTable(options?: DeleteWordTableCommandOptions): ReturnType;
  /** Fills, expands, or inserts one parsed table matrix atomically. */
  pasteWordTableMatrix(options: PasteWordTableMatrixCommandOptions): ReturnType;
  /** Clears selected cell bodies without changing table topology. */
  clearWordTableCellContents(
    options?: SelectionBackedCommandOptions<
      ClearWordTableCellContentsCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Inserts one Word table row. */
  addWordTableRow(options: AddWordTableRowCommandOptions): ReturnType;
  /** Inserts multiple Word table rows as one history item. */
  addWordTableRows(options: AddWordTableRowsCommandOptions): ReturnType;
  /** Deletes selected or explicit Word table rows. */
  deleteWordTableRows(
    options?: SelectionBackedCommandOptions<
      DeleteWordTableRowsCommandOptions,
      "from" | "to"
    >
  ): ReturnType;
  /** Moves an explicit Word table row range. */
  moveWordTableRows(options: MoveWordTableRowsCommandOptions): ReturnType;
  /** Distributes selected or explicit Word table row heights. */
  distributeWordTableRows(
    options?: SelectionBackedCommandOptions<
      DistributeWordTableRowsCommandOptions,
      "from" | "to"
    >
  ): ReturnType;
  /** Updates one Word table row height. */
  setWordTableRowHeight(options: SetWordTableRowHeightCommandOptions): ReturnType;
  /** Updates attrs on one Word table row. */
  setWordTableRowAttrs(options: SetWordTableRowAttrsCommandOptions): ReturnType;
  /** Inserts one Word table grid column. */
  addWordTableColumn(options: AddWordTableColumnCommandOptions): ReturnType;
  /** Inserts multiple Word table grid columns as one history item. */
  addWordTableColumns(options: AddWordTableColumnsCommandOptions): ReturnType;
  /** Deletes selected or explicit Word table grid columns. */
  deleteWordTableColumns(
    options?: SelectionBackedCommandOptions<
      DeleteWordTableColumnsCommandOptions,
      "from" | "to"
    >
  ): ReturnType;
  /** Moves an explicit Word table grid-column range. */
  moveWordTableColumns(options: MoveWordTableColumnsCommandOptions): ReturnType;
  /** Distributes selected or explicit Word table grid-column widths. */
  distributeWordTableColumns(
    options?: SelectionBackedCommandOptions<
      DistributeWordTableColumnsCommandOptions,
      "from" | "to"
    >
  ): ReturnType;
  /** Updates one declared Word table grid-column width. */
  setWordTableColumnWidth(
    options: SetWordTableColumnWidthCommandOptions
  ): ReturnType;
  /** Inserts one explicitly routed Word table cell. */
  addWordTableCell(options: AddWordTableCellCommandOptions): ReturnType;
  /** Deletes one explicitly routed Word table cell. */
  deleteWordTableCell(options: DeleteWordTableCellCommandOptions): ReturnType;
  /** Updates attrs on one Word table. */
  setWordTableAttrs(options: SetWordTableAttrsCommandOptions): ReturnType;
  /** Updates attrs over a semantic Table cell rectangle. */
  setWordTableCellAttrs(
    options: SelectionBackedCommandOptions<
      SetWordTableCellAttrsCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Updates one margin side over a semantic Table cell rectangle. */
  setWordTableCellMargin(
    options: SelectionBackedCommandOptions<
      SetWordTableCellMarginCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Applies one border topology over a semantic Table cell rectangle. */
  setWordTableCellBorders(
    options: SelectionBackedCommandOptions<
      SetWordTableCellBordersCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Recolors existing visible orthogonal edges without changing their topology. */
  setWordTableCellBorderColor(
    options: SelectionBackedCommandOptions<SetWordTableCellBorderColorCommandOptions, TableRectCoordinate>
  ): ReturnType;
  /** Edits existing visible edges, preserving hidden borders and omitted fields. */
  setWordTableCellBorderFormat(
    options: SelectionBackedCommandOptions<SetWordTableCellBorderFormatCommandOptions, TableRectCoordinate>
  ): ReturnType;
  /** Clears direct formatting over selected or explicit Table cells. */
  clearWordTableCellFormatting(
    options?: SelectionBackedCommandOptions<
      ClearWordTableCellFormattingCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Merges selected or explicit Table cells. */
  mergeWordTableCells(
    options?: SelectionBackedCommandOptions<
      MergeWordTableCellsCommandOptions,
      TableRectCoordinate
    >
  ): ReturnType;
  /** Splits one selected or explicit semantic Table cell. */
  splitWordTableCell(
    options?: SelectionBackedCommandOptions<
      SplitWordTableCellCommandOptions,
      "rowIndex" | "columnIndex"
    >
  ): ReturnType;
  /** Applies one explicit Word table repair policy. */
  repairWordTable(options: RepairWordTableCommandOptions): ReturnType;
  /** Applies a table style, installing a missing built-in definition. */
  applyWordTableStyle(options: ApplyWordTableStyleCommandOptions): ReturnType;
  /** Changes the conditional-formatting look switches of one table. */
  setWordTableLook(options: SetWordTableLookCommandOptions): ReturnType;
}

/** Editor command options for applying a table style to one table. */
export interface ApplyWordTableStyleCommandOptions
  extends ApplyWordTableStyleOptions, WordTableEditorLocateOptions {}

/** Editor command options for changing look switches on one table. */
export interface SetWordTableLookCommandOptions
  extends SetWordTableLookOptions, WordTableEditorLocateOptions {}

declare module "@quirekit/core" {
  interface Commands<ReturnType> {
    /** Commands installed by the WordTable extension. */
    readonly wordTable: WordTableCommandMethods<ReturnType>;
  }
}
