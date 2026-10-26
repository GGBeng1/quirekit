import type { QuireCommandPosition, QuireJSONContent } from "@quirekit/core";
import type { Node as PMNode } from "@quirekit/pm";
import type { WordCellInsertDeleteRoute } from "@quirekit/classic-revision-contract";
import type { WordTableMapDiagnostic } from "../map";
import type {
  RepairWordTableOptions,
  WordTableRepairMode,
  WordTableRepairReport
} from "./repair/types";
import type {
  WordTableAttrs,
  WordTableBorder,
  WordTableCellAttrs,
  WordTableRowAttrs,
  WordTableRowHeight,
  WordTableWidth
} from "../types";

/** Side used by relative row and column insertion commands. */
export type WordTableInsertSide = "before" | "after";

/** Repair policy shared by commands that consume the Word table map. */
export interface WordTableCommandRepairOptions {
  /**
   * Repair mode applied before the requested mutation.
   *
   * `safe` is the default. `explicit` uses the package's content-preserving
   * guarded choices and should only be passed after a user-authorized action.
   */
  readonly repair?: WordTableRepairMode;
}

/** Failure reasons returned by pure Word table commands. */
export type WordTableCommandFailureReason =
  | "no-table"
  | "invalid-selection"
  | "malformed-table"
  | "unsupported-merge"
  | "unsupported-border-color"
  | "unsupported-border-format"
  | "invalid-content"
  | "empty-result";

/** Successful result returned by a pure Word table command. */
export interface WordTableCommandSuccess<Value> {
  /** Whether the command succeeded. */
  readonly ok: true;
  /** Value produced by the command. */
  readonly value: Value;
  /** Repairs applied before the requested command, when any were necessary. */
  readonly repair?: WordTableRepairReport;
}

/** Failed result returned by a pure Word table command. */
export interface WordTableCommandFailure {
  /** Whether the command succeeded. */
  readonly ok: false;
  /** Machine-readable failure reason. */
  readonly reason: WordTableCommandFailureReason;
  /** Diagnostics that made the command fail, when available. */
  readonly diagnostics?: readonly WordTableMapDiagnostic[];
}

/** Typed result returned by pure Word table commands. */
export type WordTableCommandResult<Value> =
  | WordTableCommandSuccess<Value>
  | WordTableCommandFailure;

/** Options used to create a new Word table. */
export interface CreateWordTableOptions {
  /** Number of rows to create. */
  readonly rowCount: number;
  /** Number of columns to create. */
  readonly columnCount: number;
  /** Optional table attrs merged onto the created `wordTable`. */
  readonly tableAttrs?: Readonly<Record<string, unknown>>;
  /** Optional row attrs merged onto every created `wordTableRow`. */
  readonly rowAttrs?: Readonly<Record<string, unknown>>;
  /** Optional cell attrs merged onto every created `wordTableCell`. */
  readonly cellAttrs?: Readonly<Record<string, unknown>>;
  /** Optional cell content used for every created cell. */
  readonly cellContent?: readonly QuireJSONContent[];
  /** Optional exact source-order content for every created cell. */
  readonly cellContents?: readonly (readonly QuireJSONContent[])[];
}

/** Options used to add a row around an existing source row. */
export interface AddWordTableRowOptions extends WordTableCommandRepairOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Side around the target row where the new row is inserted. */
  readonly side: WordTableInsertSide;
  /** Whether to copy the adjacent row offsets instead of using a full-width row. */
  readonly copyRowShape?: boolean;
}

/** Options used to add multiple rows around one existing source row. */
export interface AddWordTableRowsOptions extends WordTableCommandRepairOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Side around the target row where the row batch is inserted. */
  readonly side: WordTableInsertSide;
  /** Positive bounded number of rows inserted atomically. */
  readonly count: number;
  /** Whether inserted rows copy adjacent row offsets and cell spans. */
  readonly copyRowShape?: boolean;
}

/** Options used to delete a row range. */
export interface DeleteWordTableRowsOptions extends WordTableCommandRepairOptions {
  /** First source row index to delete. */
  readonly from: number;
  /** Last source row index to delete, inclusive. Defaults to `from`. */
  readonly to?: number;
}

/** Options used to move a row range to a row insertion boundary. */
export interface MoveWordTableRowsOptions extends WordTableCommandRepairOptions {
  /** First source row index to move. */
  readonly from: number;
  /** Last source row index to move, inclusive. Defaults to `from`. */
  readonly to?: number;
  /** Source-table row boundary before which the moved range is inserted. */
  readonly targetIndex: number;
}

/** Options used to add a column around an existing grid column. */
export interface AddWordTableColumnOptions extends WordTableCommandRepairOptions {
  /** Target grid column index. */
  readonly columnIndex: number;
  /** Side around the target column where the new column is inserted. */
  readonly side: WordTableInsertSide;
}

/** Options used to add multiple grid columns around one target column. */
export interface AddWordTableColumnsOptions extends WordTableCommandRepairOptions {
  /** Target grid column index. */
  readonly columnIndex: number;
  /** Side around the target column where the column batch is inserted. */
  readonly side: WordTableInsertSide;
  /** Positive bounded number of grid columns inserted atomically. */
  readonly count: number;
}

/** Options used to delete a column range. */
export interface DeleteWordTableColumnsOptions extends WordTableCommandRepairOptions {
  /** First grid column index to delete. */
  readonly from: number;
  /** Last grid column index to delete, inclusive. Defaults to `from`. */
  readonly to?: number;
}

/** Options used to move a grid column range to a column insertion boundary. */
export interface MoveWordTableColumnsOptions extends WordTableCommandRepairOptions {
  /** First grid column index to move. */
  readonly from: number;
  /** Last grid column index to move, inclusive. Defaults to `from`. */
  readonly to?: number;
  /** Source-table grid boundary before which the moved range is inserted. */
  readonly targetIndex: number;
}

/** Options used to add one explicit boundary or routed interior cell. */
export interface AddWordTableCellOptions extends WordTableCommandRepairOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Positive logical grid span consumed by the inserted cell. Defaults to one. */
  readonly gridSpan?: number;
  /** Boundary whose existing grid offset supplies the new cell slot. */
  readonly side?: WordTableInsertSide;
  /** Direct insertion index for an explicitly routed interior cell. */
  readonly cellIndex?: number;
  /** Exact row-local route; required for an interior insertion. */
  readonly route?: WordCellInsertDeleteRoute;
}

/** Options used to delete one explicit boundary or routed interior cell. */
export interface DeleteWordTableCellOptions extends WordTableCommandRepairOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Direct cell index within the row. */
  readonly cellIndex: number;
  /** Exact row-local route; required for an interior deletion. */
  readonly route?: WordCellInsertDeleteRoute;
}

/** Options used to merge a rectangular grid region. */
export interface MergeWordTableCellsOptions extends WordTableCommandRepairOptions {
  /** First row in the requested merge rectangle. */
  readonly startRow: number;
  /** First grid column in the requested merge rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested merge rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested merge rectangle. */
  readonly columnSpan: number;
}

/** Options used to split one semantic cell. */
export interface SplitWordTableCellOptions extends WordTableCommandRepairOptions {
  /** Row coordinate inside the semantic cell to split. */
  readonly rowIndex: number;
  /** Grid column coordinate inside the semantic cell to split. */
  readonly columnIndex: number;
  /** Requested output row count. Defaults to the current semantic row span. */
  readonly rowCount?: number;
  /** Requested output column count. Defaults to the current semantic column span. */
  readonly columnCount?: number;
}

/** Options used to update attrs on a Word table node. */
export interface SetWordTableAttrsOptions {
  /** Attrs merged onto the source table. */
  readonly attrs: Readonly<Partial<WordTableAttrs>>;
}

/** Border topology presets applied relative to one semantic cell rectangle. */
export type WordTableCellBorderPreset =
  | "none"
  | "all"
  | "outside"
  | "inside"
  | "top"
  | "right"
  | "bottom"
  | "left";

/** Options used to update one declared Word table grid column width. */
export interface SetWordTableColumnWidthOptions {
  /** Target grid column index. */
  readonly columnIndex: number;
  /** Column width to write, or null to clear the direct width. */
  readonly width: WordTableWidth | null;
}

/** Options used to update attrs on a Word table row. */
export interface SetWordTableRowAttrsOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Attrs merged onto the target row. */
  readonly attrs: Readonly<Partial<WordTableRowAttrs>>;
}

/** Options used to update one Word table row height. */
export interface SetWordTableRowHeightOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Row height to write, or null to clear the direct height. */
  readonly height: WordTableRowHeight | null;
}

/** Options used to distribute declared Word table grid column widths. */
export interface DistributeWordTableColumnsOptions extends WordTableCommandRepairOptions {
  /** First grid column index to distribute. */
  readonly from: number;
  /** Last grid column index to distribute, inclusive. Defaults to `from`. */
  readonly to?: number;
  /** Optional total width to distribute instead of deriving from current grid widths. */
  readonly totalWidth?: WordTableWidth;
}

/** Options used to distribute direct Word table row heights. */
export interface DistributeWordTableRowsOptions {
  /** First source row index to distribute. */
  readonly from: number;
  /** Last source row index to distribute, inclusive. Defaults to `from`. */
  readonly to?: number;
  /** Optional total height to distribute instead of deriving from current row heights. */
  readonly totalHeight?: WordTableRowHeight;
}

/** Options used to update attrs over a Word table cell grid rect. */
export interface SetWordTableCellAttrsOptions extends WordTableCommandRepairOptions {
  /** First row in the requested formatting rectangle. */
  readonly startRow: number;
  /** First grid column in the requested formatting rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested formatting rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested formatting rectangle. */
  readonly columnSpan: number;
  /** Attrs merged onto every explicit cell covered by the semantic rectangle. */
  readonly attrs: Readonly<Partial<WordTableCellAttrs>>;
}

/** Named side updated by one direct cell-margin command. */
export type WordTableCellMarginSide = "top" | "right" | "bottom" | "left";

/** Options used to update one margin side over a Word table cell grid rect. */
export interface SetWordTableCellMarginOptions extends WordTableCommandRepairOptions {
  /** First row in the requested formatting rectangle. */
  readonly startRow: number;
  /** First grid column in the requested formatting rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested formatting rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested formatting rectangle. */
  readonly columnSpan: number;
  /** Exact margin side updated on every covered explicit cell. */
  readonly side: WordTableCellMarginSide;
  /** Direct margin value, or null to clear that side. */
  readonly margin: WordTableWidth | null;
}

/** Options used to apply one border topology over a Word Table cell grid rect. */
export interface SetWordTableCellBordersOptions
  extends WordTableCommandRepairOptions {
  /** First row in the requested formatting rectangle. */
  readonly startRow: number;
  /** First grid column in the requested formatting rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested formatting rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested formatting rectangle. */
  readonly columnSpan: number;
  /** Selection-relative border topology to apply. */
  readonly preset: WordTableCellBorderPreset;
  /** Visible border used by the preset, or null when clearing. */
  readonly border: WordTableBorder | null;
}

/** Options used to recolor existing visible borders over a semantic rectangle. */
export interface SetWordTableCellBorderColorOptions extends Omit<SetWordTableCellBordersOptions, "preset" | "border"> {
  /** Explicit six-digit RGB or auto; only existing visible edges are recolored. */
  readonly color: string;
}

/** Independently editable fields of an existing visible orthogonal border. */
export interface WordTableCellBorderFormat {
  /** Supported visible style; nil/none belong to topology commands. */
  readonly style?: "single" | "double" | "dotted" | "dashed";
  /** Integer eighth-points in the supported 2–96 range. */
  readonly size?: number;
  /** Six-digit RGB or auto; explicit color overrides theme references. */
  readonly color?: string;
}

/** Existing-edge formatting, without creating absent borders. */
export interface SetWordTableCellBorderFormatOptions extends Omit<SetWordTableCellBordersOptions, "preset" | "border"> {
  /** Nonempty property patch; omitted fields retain their original values. */
  readonly format: WordTableCellBorderFormat;
}

/** Options used to clear styling attrs over a Word table cell grid rect. */
export interface ClearWordTableCellFormattingOptions {
  /** First row in the requested formatting rectangle. */
  readonly startRow: number;
  /** First grid column in the requested formatting rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested formatting rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested formatting rectangle. */
  readonly columnSpan: number;
}

/** Options used to delete one complete logical Word table. */
export type DeleteWordTableOptions = Readonly<Record<never, never>>;

/** Options used to clear cell bodies over a Word table grid rect. */
export interface ClearWordTableCellContentsOptions
  extends WordTableCommandRepairOptions {
  /** First row in the requested content rectangle. */
  readonly startRow: number;
  /** First grid column in the requested content rectangle. */
  readonly startColumn: number;
  /** Number of rows covered by the requested content rectangle. */
  readonly rowSpan: number;
  /** Number of grid columns covered by the requested content rectangle. */
  readonly columnSpan: number;
}

/** Options used to toggle a boolean row policy attr. */
export interface ToggleWordTableRowPolicyOptions {
  /** Target source row index. */
  readonly rowIndex: number;
  /** Optional explicit value. When omitted, the current value is inverted. */
  readonly value?: boolean;
}

/** Options used by editor commands that locate an existing Word table. */
export interface WordTableEditorLocateOptions {
  /** Optional absolute document position of the table node. */
  readonly tablePos?: number;
}

/** Editor command options for an explicit table repair operation. */
export interface RepairWordTableCommandOptions
  extends RepairWordTableOptions, WordTableEditorLocateOptions {}

/** Options used by the editor command that inserts a Word table. */
export interface InsertWordTableCommandOptions extends CreateWordTableOptions {
  /** Optional document position or range where the table should be inserted. */
  readonly position?: QuireCommandPosition;
}

/** Editor command options used to delete one complete logical Word table. */
export interface DeleteWordTableCommandOptions
  extends DeleteWordTableOptions, WordTableEditorLocateOptions {}

/** Editor command options used to clear cell bodies over a grid rect. */
export interface ClearWordTableCellContentsCommandOptions
  extends ClearWordTableCellContentsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to add a row around a source row. */
export interface AddWordTableRowCommandOptions
  extends AddWordTableRowOptions, WordTableEditorLocateOptions {}

/** Editor command options used to add multiple rows atomically. */
export interface AddWordTableRowsCommandOptions
  extends AddWordTableRowsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to delete rows. */
export interface DeleteWordTableRowsCommandOptions
  extends DeleteWordTableRowsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to move rows. */
export interface MoveWordTableRowsCommandOptions
  extends MoveWordTableRowsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to distribute row heights. */
export interface DistributeWordTableRowsCommandOptions
  extends DistributeWordTableRowsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update one row height. */
export interface SetWordTableRowHeightCommandOptions
  extends SetWordTableRowHeightOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update attrs on one source row. */
export interface SetWordTableRowAttrsCommandOptions
  extends SetWordTableRowAttrsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to add a column around a source grid column. */
export interface AddWordTableColumnCommandOptions
  extends AddWordTableColumnOptions, WordTableEditorLocateOptions {}

/** Editor command options used to add multiple grid columns atomically. */
export interface AddWordTableColumnsCommandOptions
  extends AddWordTableColumnsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to add one boundary cell. */
export interface AddWordTableCellCommandOptions
  extends AddWordTableCellOptions, WordTableEditorLocateOptions {}

/** Editor command options used to delete one boundary cell. */
export interface DeleteWordTableCellCommandOptions
  extends DeleteWordTableCellOptions, WordTableEditorLocateOptions {}

/** Editor command options used to delete grid columns. */
export interface DeleteWordTableColumnsCommandOptions
  extends DeleteWordTableColumnsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to move grid columns. */
export interface MoveWordTableColumnsCommandOptions
  extends MoveWordTableColumnsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to distribute grid column widths. */
export interface DistributeWordTableColumnsCommandOptions
  extends DistributeWordTableColumnsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update one grid column width. */
export interface SetWordTableColumnWidthCommandOptions
  extends SetWordTableColumnWidthOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update attrs on one Table node. */
export interface SetWordTableAttrsCommandOptions
  extends SetWordTableAttrsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update cell attrs over a grid rect. */
export interface SetWordTableCellAttrsCommandOptions
  extends SetWordTableCellAttrsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to update one margin side over a cell rect. */
export interface SetWordTableCellMarginCommandOptions
  extends SetWordTableCellMarginOptions, WordTableEditorLocateOptions {}

/** Editor command options used to apply a cell border topology. */
export interface SetWordTableCellBordersCommandOptions
  extends SetWordTableCellBordersOptions, WordTableEditorLocateOptions {}

/** Editor command options used to recolor existing visible cell edges. */
export interface SetWordTableCellBorderColorCommandOptions
  extends SetWordTableCellBorderColorOptions, WordTableEditorLocateOptions {}

/** Editor options used to format existing visible cell edges. */
export interface SetWordTableCellBorderFormatCommandOptions
  extends SetWordTableCellBorderFormatOptions, WordTableEditorLocateOptions {}

/** Editor command options used to clear cell formatting over a grid rect. */
export interface ClearWordTableCellFormattingCommandOptions
  extends ClearWordTableCellFormattingOptions, WordTableEditorLocateOptions {}

/** Editor command options used to merge cells. */
export interface MergeWordTableCellsCommandOptions
  extends MergeWordTableCellsOptions, WordTableEditorLocateOptions {}

/** Editor command options used to split one semantic cell. */
export interface SplitWordTableCellCommandOptions
  extends SplitWordTableCellOptions, WordTableEditorLocateOptions {}

/**
 * Creates a successful command result.
 *
 * @param value - Command result value.
 * @returns Successful command result.
 */
export function wordTableCommandSuccess<Value>(
  value: Value,
  repair?: WordTableRepairReport
): WordTableCommandSuccess<Value> {
  return repair ? { ok: true, value, repair } : { ok: true, value };
}

/**
 * Creates a failed command result.
 *
 * @param reason - Failure reason.
 * @param diagnostics - Optional map diagnostics.
 * @returns Failed command result.
 */
export function wordTableCommandFailure(
  reason: WordTableCommandFailureReason,
  diagnostics?: readonly WordTableMapDiagnostic[]
): WordTableCommandFailure {
  return diagnostics
    ? { ok: false, reason, diagnostics }
    : { ok: false, reason };
}

/**
 * Preserves a preflight repair report on a downstream command result.
 *
 * @param result - Result returned after the repaired table was transformed.
 * @param repair - Preflight repair report.
 * @returns Result carrying the repair report when the transform succeeded.
 */
export function withWordTableRepairReport<Value>(
  result: WordTableCommandResult<Value>,
  repair: WordTableRepairReport | undefined
): WordTableCommandResult<Value> {
  return result.ok && repair
    ? wordTableCommandSuccess(result.value, repair)
    : result;
}

/** Result value returned by commands that may delete the whole table. */
export type WordTableMaybeDeleted = PMNode | null;
