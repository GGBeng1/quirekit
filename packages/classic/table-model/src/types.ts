import type { NodeSpec } from "@quirekit/pm";
import type {
  WordNodePropertyRevisionAttrs,
  WordStructuralRevisionAttrs
} from "@quirekit/classic-revision-contract";

/** Word-compatible table node names owned by this package. */
export type WordTableNodeName = "wordTable" | "wordTableRow" | "wordTableCell";

/** Table roles compatible with ProseMirror table helper conventions. */
export type WordTableRole = "table" | "row" | "cell";

/** Width units used by OOXML table, row, and cell properties. */
export type WordTableWidthUnit = "auto" | "dxa" | "pct" | "nil" | "px";

/** Table layout mode requested by Word table properties. */
export type WordTableLayout = "autofit" | "fixed";

/** Table or row horizontal alignment. */
export type WordTableAlignment = "left" | "center" | "right";

/** Cell vertical alignment. */
export type WordTableVerticalAlignment = "top" | "center" | "bottom";

/** Word vertical merge state carried by a cell. */
export type WordTableVerticalMerge = "restart" | "continue";

/** Word horizontal merge state retained for legacy import/export fidelity. */
export type WordTableHorizontalMerge = "restart" | "continue";

/** Cell text direction values that can be represented by Word tables. */
export type WordTableTextDirection =
  | "lrTb"
  | "tbRl"
  | "btLr"
  | "lrTbV"
  | "tbRlV";

/** Border location names shared by table and cell border maps. */
export type WordTableBorderName =
  | "top"
  | "right"
  | "bottom"
  | "left"
  | "insideH"
  | "insideV"
  | "tl2br"
  | "tr2bl";

/** Height rule used by Word table rows. */
export type WordTableRowHeightRule = "auto" | "atLeast" | "exact";

/** Generic object used for source-specific values this package does not own. */
export type WordTableUnknownRecord = Readonly<Record<string, unknown>>;

/** ProseMirror node spec with a table role marker for table helpers. */
export interface WordTableRoleNodeSpec extends NodeSpec {
  /** Table role consumed by table map and command helpers. */
  readonly tableRole: WordTableRole;
}

/** Width value in a Word-compatible table property. */
export interface WordTableWidth {
  /** Numeric width value in the declared unit, or null when Word uses auto width. */
  readonly value: number | null;
  /** Unit attached to the width value. */
  readonly unit: WordTableWidthUnit;
  /** Raw imported value when the importer needs exact export fidelity. */
  readonly rawValue?: string;
}

/** One logical grid column declared by a Word table grid. */
export interface WordTableGridColumn {
  /** Column width in Word-compatible units, or null when unspecified. */
  readonly width: WordTableWidth | null;
  /** Raw source attributes retained for lossless export. */
  readonly preservation?: WordTableRawPreservation | null;
}

/** Word table look flags that control conditional table styles. */
export interface WordTableLook {
  /** Whether first-row conditional formatting is enabled. */
  readonly firstRow: boolean;
  /** Whether last-row conditional formatting is enabled. */
  readonly lastRow: boolean;
  /** Whether first-column conditional formatting is enabled. */
  readonly firstColumn: boolean;
  /** Whether last-column conditional formatting is enabled. */
  readonly lastColumn: boolean;
  /** Whether horizontal banding is enabled. */
  readonly bandedRows: boolean;
  /** Whether vertical banding is enabled. */
  readonly bandedColumns: boolean;
  /** Raw table look bitmask or source value when present. */
  readonly rawValue?: string;
}

/** Margins applied around text inside a Word table cell. */
export interface WordTableCellMargins {
  /** Top margin, or null when inherited. */
  readonly top: WordTableWidth | null;
  /** Right margin, or null when inherited. */
  readonly right: WordTableWidth | null;
  /** Bottom margin, or null when inherited. */
  readonly bottom: WordTableWidth | null;
  /** Left margin, or null when inherited. */
  readonly left: WordTableWidth | null;
}

/** Border value preserved from Word table border properties. */
export interface WordTableBorder {
  /** Border style name, such as `single`, `nil`, or a Word-specific value. */
  readonly style: string;
  /** Border width in eighths of a point when known. */
  readonly size: number | null;
  /** Border color value, or null when automatic or inherited. */
  readonly color: string | null;
  /** Border spacing in points when known. */
  readonly space: number | null;
  /** Theme color slot used by the border, when declared. */
  readonly themeColor?: string | null;
  /** Theme tint transform in OOXML hexadecimal form, when declared. */
  readonly themeTint?: string | null;
  /** Theme shade transform in OOXML hexadecimal form, when declared. */
  readonly themeShade?: string | null;
  /** Whether Word requests a shadow for this border. */
  readonly shadow?: boolean | null;
  /** Whether Word requests a frame-style border. */
  readonly frame?: boolean | null;
}

/** Border map for a table or cell. */
export interface WordTableBorders {
  /** Top border, or null when absent. */
  readonly top: WordTableBorder | null;
  /** Right border, or null when absent. */
  readonly right: WordTableBorder | null;
  /** Bottom border, or null when absent. */
  readonly bottom: WordTableBorder | null;
  /** Left border, or null when absent. */
  readonly left: WordTableBorder | null;
  /** Inner horizontal border, or null when not declared. */
  readonly insideH: WordTableBorder | null;
  /** Inner vertical border, or null when not declared. */
  readonly insideV: WordTableBorder | null;
  /** Diagonal border from top-left to bottom-right, when declared on a cell. */
  readonly tl2br?: WordTableBorder | null;
  /** Diagonal border from top-right to bottom-left, when declared on a cell. */
  readonly tr2bl?: WordTableBorder | null;
}

/** Shading value preserved from Word table properties. */
export interface WordTableShading {
  /** Fill color, or null when no fill is declared. */
  readonly fill: string | null;
  /** Foreground color, or null when absent. */
  readonly color: string | null;
  /** Word shading pattern value, or null when absent. */
  readonly pattern: string | null;
  /** Theme slot used by the foreground color, when declared. */
  readonly themeColor?: string | null;
  /** Theme tint applied to the foreground color, when declared. */
  readonly themeTint?: string | null;
  /** Theme shade applied to the foreground color, when declared. */
  readonly themeShade?: string | null;
  /** Theme slot used by the fill color, when declared. */
  readonly themeFill?: string | null;
  /** Theme tint applied to the fill color, when declared. */
  readonly themeFillTint?: string | null;
  /** Theme shade applied to the fill color, when declared. */
  readonly themeFillShade?: string | null;
}

/** Row height property. */
export interface WordTableRowHeight {
  /** Height value in twentieths of a point. */
  readonly value: number;
  /** Rule describing whether the height is exact, minimum, or automatic. */
  readonly rule: WordTableRowHeightRule;
}

/** Conditional table style marker attached to a row or cell. */
export interface WordTableConditionalStyle {
  /** Conditional style name or source token. */
  readonly type: string;
  /** Raw source value retained for export fidelity. */
  readonly rawValue?: string;
}

/** Vertical merge chain metadata retained before the table map is computed. */
export interface WordTableVerticalMergePreservation {
  /** Stable importer-assigned chain id when one is known. */
  readonly chainId: string | null;
  /** Zero-based source row index where the restart cell appeared. */
  readonly restartRow: number | null;
  /** Zero-based source column index where the restart cell appeared. */
  readonly restartColumn: number | null;
}

/** Floating table anchor and wrapping data. */
export interface WordTableFloating {
  /** Horizontal anchor type, such as page, margin, or text. */
  readonly horizontalAnchor: string | null;
  /** Vertical anchor type, such as page, margin, or text. */
  readonly verticalAnchor: string | null;
  /** Horizontal position value in source units. */
  readonly x: number | null;
  /** Vertical position value in source units. */
  readonly y: number | null;
  /** Named horizontal position relative to the selected anchor. */
  readonly xSpec?: string | null;
  /** Named vertical position relative to the selected anchor. */
  readonly ySpec?: string | null;
  /** Distance between the table and surrounding text on the left. */
  readonly leftFromText?: number | null;
  /** Distance between the table and surrounding text on the right. */
  readonly rightFromText?: number | null;
  /** Distance between the table and surrounding text above. */
  readonly topFromText?: number | null;
  /** Distance between the table and surrounding text below. */
  readonly bottomFromText?: number | null;
  /** Text wrapping mode around the floating table. */
  readonly wrap: string | null;
  /** Exact Word table-overlap disposition retained for OOXML export. */
  readonly overlap?: string | null;
}

/** Extra source data retained when schema attrs cannot model it directly. */
export interface WordTableRawPreservation {
  /** Source that produced the raw data, such as OOXML or LitAST. */
  readonly source: string;
  /** Raw attributes from the source representation. */
  readonly rawAttributes?: WordTableUnknownRecord;
  /** Original LitAST attributes retained for structured re-projection. */
  readonly litAstAttrs?: WordTableUnknownRecord;
  /** Import-time normalized attrs used for field-level invalidation. */
  readonly editableSnapshot?: WordTableUnknownRecord;
  /** Raw child nodes or source fragments kept for lossless export. */
  readonly rawChildren?: readonly unknown[];
  /** Human-readable preservation notes for debugging importer decisions. */
  readonly notes?: readonly string[];
}

/** Layout-bearing properties compiled from the selected Word table-style chain. */
export interface WordTableStyleProperties {
  /** Base-to-leaf table style ids that contributed to the snapshot. */
  readonly inheritanceChain: readonly string[];
  /** Style-derived default cell margins before direct table properties win. */
  readonly defaultCellMargins: WordTableCellMargins | null;
  /** Style-derived table borders before direct table properties win. */
  readonly borders: WordTableBorders | null;
}

/** Attributes on the `wordTable` node. */
export interface WordTableAttrs {
  /** Reversible direct table-property and grid endpoints owned by this node. */
  readonly wordTablePropertyRevisions:
    | readonly WordNodePropertyRevisionAttrs[]
    | null;
  /** Word table style id, or null when no direct style is declared. */
  readonly tableStyle: string | null;
  /** Style-derived layout snapshot kept separate from direct OOXML properties. */
  readonly styleProperties: WordTableStyleProperties | null;
  /** Preferred table width. */
  readonly width: WordTableWidth | null;
  /** Table horizontal alignment. */
  readonly alignment: WordTableAlignment | null;
  /** Table indent from the containing text margin. */
  readonly tableIndent: WordTableWidth | null;
  /** Table layout behavior. */
  readonly tableLayout: WordTableLayout | null;
  /** Conditional style look flags. */
  readonly tableLook: WordTableLook | null;
  /** Whether visual column order is right-to-left. */
  readonly bidiVisual: boolean | null;
  /** Declared table grid columns. */
  readonly grid: readonly WordTableGridColumn[] | null;
  /** Legacy grid column widths retained for importers that do not emit rich grid columns yet. */
  readonly legacyColumns: readonly number[] | null;
  /** Table-level borders. */
  readonly borders: WordTableBorders | null;
  /** Table-level shading. */
  readonly shading: WordTableShading | null;
  /** Table-level cell spacing. */
  readonly cellSpacing: WordTableWidth | null;
  /** Default margins inherited by cells. */
  readonly defaultCellMargins: WordTableCellMargins | null;
  /** Floating table positioning data. */
  readonly floating: WordTableFloating | null;
  /** Row and column band sizes for conditional styles. */
  readonly styleBandSize: WordTableUnknownRecord | null;
  /** Source data retained for lossless import/export. */
  readonly preservation: WordTableRawPreservation | null;
}

/** Attributes on the `wordTableRow` node. */
export interface WordTableRowAttrs {
  /** Reversible direct row-property endpoints owned by this node. */
  readonly wordTablePropertyRevisions:
    | readonly WordNodePropertyRevisionAttrs[]
    | null;
  /** Pending structural insertion/deletion owned by this complete row. */
  readonly wordTableStructuralRevision: WordStructuralRevisionAttrs | null;
  /** Whether the row repeats as a header row on paginated continuation pages. */
  readonly isHeader: boolean;
  /** Preferred or exact row height. */
  readonly height: WordTableRowHeight | null;
  /** Whether the row should avoid splitting across pages. */
  readonly cantSplit: boolean;
  /** Number of omitted grid columns before the first explicit cell. */
  readonly gridBefore: number;
  /** Number of omitted grid columns after the last explicit cell. */
  readonly gridAfter: number;
  /** Row-specific cell spacing. */
  readonly cellSpacing: WordTableWidth | null;
  /** Row-level border exceptions. */
  readonly borders: WordTableBorders | null;
  /** Row horizontal alignment override. */
  readonly alignment: WordTableAlignment | null;
  /** Conditional style marker attached to this row. */
  readonly conditionalStyle: WordTableConditionalStyle | null;
  /** Source data retained for lossless import/export. */
  readonly preservation: WordTableRawPreservation | null;
}

/** Attributes on the `wordTableCell` node. */
export interface WordTableCellAttrs {
  /** Reversible direct cell-property endpoints owned by this node. */
  readonly wordTablePropertyRevisions:
    | readonly WordNodePropertyRevisionAttrs[]
    | null;
  /** Pending isolated-cell or coordinated-column structural action. */
  readonly wordTableStructuralRevision: WordStructuralRevisionAttrs | null;
  /** Preferred cell width. */
  readonly width: WordTableWidth | null;
  /** ProseMirror-style horizontal span used by table helpers. */
  readonly colspan: number;
  /** Word grid span value retained separately for mismatch diagnostics. */
  readonly gridSpan: number;
  /** ProseMirror-style vertical span when the map can derive one. */
  readonly rowspan: number;
  /** Word vertical merge marker. */
  readonly vMerge: WordTableVerticalMerge | null;
  /** Import-time vertical merge chain metadata. */
  readonly vMergePreservation: WordTableVerticalMergePreservation | null;
  /** Legacy horizontal merge marker retained for export fidelity. */
  readonly hMerge: WordTableHorizontalMerge | null;
  /** Cell borders. */
  readonly borders: WordTableBorders | null;
  /** Cell shading. */
  readonly shading: WordTableShading | null;
  /** CSS-compatible background color shortcut for UI rendering. */
  readonly backgroundColor: string | null;
  /** Whether text wrapping is disabled for this cell. */
  readonly noWrap: boolean | null;
  /** Cell-specific margins. */
  readonly cellMargins: WordTableCellMargins | null;
  /** Text direction inside the cell. */
  readonly textDirection: WordTableTextDirection | null;
  /** Whether Word fit-text behavior is enabled. */
  readonly fitText: boolean | null;
  /** Vertical alignment inside the cell. */
  readonly verticalAlign: WordTableVerticalAlignment | null;
  /** Whether the cell end mark is hidden in Word layout. */
  readonly hideMark: boolean | null;
  /** Conditional style marker attached to this cell. */
  readonly conditionalStyle: WordTableConditionalStyle | null;
  /** Source data retained for lossless import/export. */
  readonly preservation: WordTableRawPreservation | null;
}

/** Raw node spec map exported by the Word table package. */
export type WordTableNodeSpecMap = Readonly<
  Record<WordTableNodeName, WordTableRoleNodeSpec>
>;
