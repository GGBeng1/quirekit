import type {
  QuireDocumentRange,
  QuireLineCap,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";

/** Units accepted by the normalized table geometry kernel. */
export type QuireTableLengthUnit = "auto" | "px" | "percent" | "none";

/** Consumer-neutral table length. */
export interface QuireTableLength {
  /** Numeric value in the declared unit, or null for automatic lengths. */
  readonly value: number | null;
  /** Unit attached to the normalized value. */
  readonly unit: QuireTableLengthUnit;
}

/** Table grid sizing policy. */
export type QuireTableLayoutMode = "auto-fit" | "fixed";

/** Horizontal table alignment inside the containing flow. */
export type QuireTableAlignment = "left" | "center" | "right";

/** Reference rectangle used by one floating-table axis. */
export type QuireTableFloatingReference = "page" | "margin" | "text";

/** Relative horizontal placement within a floating-table reference rectangle. */
export type QuireTableFloatingHorizontalAlignment =
  | "start"
  | "center"
  | "end"
  | "inside"
  | "outside";

/** Relative vertical placement within a floating-table reference rectangle. */
export type QuireTableFloatingVerticalAlignment =
  | "start"
  | "center"
  | "end"
  | "inside"
  | "outside";

/** Normalized horizontal axis of a floating table. */
export interface QuireTableFloatingHorizontalPosition {
  /** Reference rectangle used to resolve the horizontal coordinate. */
  readonly reference: QuireTableFloatingReference;
  /** Absolute CSS-pixel offset from the reference start, when declared. */
  readonly offset: number | null;
  /** Relative alignment that takes precedence over the absolute offset. */
  readonly alignment: QuireTableFloatingHorizontalAlignment | null;
  /** Optional CSS-pixel expansion applied before alignment and absolute offsets. */
  readonly referenceExpansion?: QuireTableFloatingReferenceExpansion | undefined;
}

/** Nonnegative physical-side expansion of a horizontal placement reference. */
export interface QuireTableFloatingReferenceExpansion {
  /** Expansion toward the physical left edge in CSS pixels. */
  readonly start: number;
  /** Expansion toward the physical right edge in CSS pixels. */
  readonly end: number;
}

/** Normalized vertical axis of a floating table. */
export interface QuireTableFloatingVerticalPosition {
  /** Reference rectangle used to resolve the vertical coordinate. */
  readonly reference: QuireTableFloatingReference;
  /** Absolute CSS-pixel offset from the reference start, when declared. */
  readonly offset: number | null;
  /** Relative alignment that takes precedence over the absolute offset. */
  readonly alignment: QuireTableFloatingVerticalAlignment | null;
}

/** CSS-pixel clearances retained around a floating table. */
export interface QuireTableFloatingClearances {
  /** Clearance above the table. */
  readonly top: number;
  /** Clearance to the table's right. */
  readonly right: number;
  /** Clearance below the table. */
  readonly bottom: number;
  /** Clearance to the table's left. */
  readonly left: number;
}

/** Consumer-neutral floating table placement source. */
export interface QuireTableFloatingPlacement {
  /** Horizontal anchor and position. */
  readonly horizontal: QuireTableFloatingHorizontalPosition;
  /** Vertical anchor and position. */
  readonly vertical: QuireTableFloatingVerticalPosition;
  /** Surrounding-text clearances retained for the flow-exclusion milestone. */
  readonly clearances: QuireTableFloatingClearances;
  /** Source wrap-mode token, or null when absent. */
  readonly wrapMode: string | null;
  /** Whether overlap with another floating table is permitted. */
  readonly allowOverlap: boolean;
}

/** Vertical content alignment inside a table cell. */
export type QuireTableVerticalAlignment = "top" | "center" | "bottom";

/** Table row height policy. */
export type QuireTableRowHeightRule = "auto" | "at-least" | "exact";

/** Normalized table row height in CSS pixels. */
export interface QuireTableRowHeight {
  /** Height in CSS pixels. */
  readonly value: number;
  /** Rule controlling whether the height is automatic, minimum, or exact. */
  readonly rule: QuireTableRowHeightRule;
}

/** Normalized table border value. */
export interface QuireTableBorder {
  /** Source-independent border style token. */
  readonly style: string;
  /** Resolved border width in CSS pixels, or null when unresolved. */
  readonly width: number | null;
  /** Border color token, or null for automatic or inherited color. */
  readonly color: string | null;
  /** Border spacing in CSS pixels, or null when absent. */
  readonly spacing: number | null;
}

/** Border map for a normalized table or cell. */
export interface QuireTableBorders {
  /** Top border, or null when absent. */
  readonly top: QuireTableBorder | null;
  /** Right border, or null when absent. */
  readonly right: QuireTableBorder | null;
  /** Bottom border, or null when absent. */
  readonly bottom: QuireTableBorder | null;
  /** Left border, or null when absent. */
  readonly left: QuireTableBorder | null;
  /** Inner horizontal border, or null when absent. */
  readonly insideH: QuireTableBorder | null;
  /** Inner vertical border, or null when absent. */
  readonly insideV: QuireTableBorder | null;
  /** Top-left to bottom-right diagonal border, when present. */
  readonly tl2br?: QuireTableBorder | null | undefined;
  /** Top-right to bottom-left diagonal border, when present. */
  readonly tr2bl?: QuireTableBorder | null | undefined;
}

/** Normalized table cell margins. */
export interface QuireTableCellMargins {
  /** Top margin, or null when inherited. */
  readonly top: QuireTableLength | null;
  /** Right margin, or null when inherited. */
  readonly right: QuireTableLength | null;
  /** Bottom margin, or null when inherited. */
  readonly bottom: QuireTableLength | null;
  /** Left margin, or null when inherited. */
  readonly left: QuireTableLength | null;
}

/** Normalized table cell shading. */
export interface QuireTableShading {
  /** Fill color token, or null when absent. */
  readonly fill: string | null;
  /** Foreground color token, or null when absent. */
  readonly color: string | null;
  /** Shading pattern token, or null when absent. */
  readonly pattern: string | null;
}

/** Horizontal range in a normalized table grid. */
export interface QuireTableGridRange {
  /** Zero-based starting column. */
  readonly startColumn: number;
  /** Number of covered columns. */
  readonly columnSpan: number;
}

/** Rectangular range in a normalized table grid. */
export interface QuireTableGridRect extends QuireTableGridRange {
  /** Zero-based starting row. */
  readonly startRow: number;
  /** Number of covered rows. */
  readonly rowSpan: number;
}

/** Omitted grid columns before or after explicit row cells. */
export interface QuireTableGridOffset extends QuireTableGridRange {
  /** Side represented by the omitted range. */
  readonly side: "before" | "after";
}

/** Diagnostic preserved while normalizing a source table. */
export interface QuireTableDiagnostic {
  /** Stable source-independent diagnostic code. */
  readonly code: string;
  /** Human-readable diagnostic message. */
  readonly message: string;
  /** Zero-based source row index, or null. */
  readonly rowIndex: number | null;
  /** Zero-based source cell index, or null. */
  readonly cellIndex: number | null;
  /** Involved grid range, or null. */
  readonly range: QuireTableGridRange | null;
  /** Involved grid rectangle, or null. */
  readonly rect: QuireTableGridRect | null;
  /** Explicit source cell identities involved in the diagnostic. */
  readonly explicitCellIds: readonly string[];
  /** Semantic cell identities involved in the diagnostic. */
  readonly semanticCellIds: readonly string[];
}

/** Intrinsic inline sizes measured before physical grid resolution. */
export interface QuireTableCellInlineMetrics {
  /** Narrowest inline size that avoids splitting non-breaking units. */
  readonly minContentWidth: number;
  /** Inline size required when no soft wrapping is accepted. */
  readonly maxContentWidth: number;
}

/** Intrinsic outer-width constraint contributed by one semantic table cell. */
export interface QuireTableGridCellConstraint {
  /** Stable semantic cell id used for diagnostics and deterministic ordering. */
  readonly id: string;
  /** Zero-based first physical grid column covered by the cell. */
  readonly startColumn: number;
  /** Number of physical grid columns covered by the cell. */
  readonly columnSpan: number;
  /** Minimum outer width including effective horizontal cell insets. */
  readonly minWidth: number;
  /** Preferred unwrapped outer width including effective horizontal cell insets. */
  readonly maxWidth: number;
}

/** Input consumed by the table layout engine for one table pass. */
export interface QuireTableLayoutInput {
  /** Stable table id within the owning layout snapshot. */
  readonly tableId: string;
  /** Document range represented by the table node. */
  readonly tableRange: QuireDocumentRange;
  /** Normalized source table data. */
  readonly source: QuireTableSource;
  /** Layout constraints supplied by the containing block flow. */
  readonly constraints: QuireTableLayoutConstraints;
  /** Callback that measures recursive cell content for a resolved cell box. */
  readonly measureContent: QuireTableCellContentMeasurer;
  /** Auto-fit intrinsic metric signature prepared before grid resolution. */
  readonly inlineMetricsSignature?: string | null | undefined;
  /** Intrinsic inline metrics keyed by semantic cell id for auto-fit sizing. */
  readonly cellInlineMetrics?: ReadonlyMap<
    string,
    QuireTableCellInlineMetrics
  > | undefined;
  /** Optional retained resolver for physical grid tracks. */
  readonly resolveGridTracks?: QuireTableGridTrackResolver | undefined;
  /** Optional retained resolver for independent base row heights. */
  readonly resolveBaseRowHeight?: QuireTableBaseRowHeightResolver | undefined;
}

/** Geometry request used to resolve one physical table grid. */
export interface QuireTableGridTrackRequest {
  /** Normalized columns in source grid order. */
  readonly columns: readonly QuireTableSourceColumn[];
  /** Left edge for the first resolved track. */
  readonly x: number;
  /** Total width available to the table grid. */
  readonly availableWidth: number;
  /** Resolved separated-border spacing between tracks. */
  readonly cellSpacing: number;
  /** Declared table layout authority. */
  readonly layoutMode: QuireTableLayoutMode | null;
  /** Intrinsic outer-width constraints in semantic cell source order. */
  readonly cellConstraints: readonly QuireTableGridCellConstraint[];
  /** Auto-fit intrinsic metric signature, or null outside auto-fit sizing. */
  readonly inlineMetricsSignature: string | null;
  /** Whether declared tracks wider than the available width shrink to fit it. */
  readonly fitToWidth?: boolean | undefined;
}

/**
 * Resolves physical table tracks through direct computation or retained reuse.
 *
 * @param request - Normalized columns and exact table geometry.
 * @returns Physical grid tracks in source column order.
 */
export type QuireTableGridTrackResolver = (
  request: QuireTableGridTrackRequest
) => readonly QuireTableGridTrack[];

/** Request used to retain one independently resolved base row height. */
export interface QuireTableBaseRowHeightRequest {
  /** Zero-based source row index. */
  readonly rowIndex: number;
  /** Canonical row/grid/cell/measurement dependency signature. */
  readonly dependencySignature: string;
  /** Resolves the row height without retained reuse. */
  readonly resolve: () => number;
}

/**
 * Resolves one independent base row height through direct work or reuse.
 *
 * @param request - Source row identity, dependency signature, and resolver.
 * @returns Base row height before rowspan compensation.
 */
export type QuireTableBaseRowHeightResolver = (
  request: QuireTableBaseRowHeightRequest
) => number;

/** Constraints used to lay out a table inside the current block flow. */
export interface QuireTableLayoutConstraints {
  /** Table origin and available width in document coordinates. */
  readonly rect: QuireRect;
  /** Automatic-row preset floor; explicit row rules override this default. */
  readonly defaultRowHeight: number;
  /** Default cell padding applied inside the border edge. */
  readonly defaultCellPadding: number;
  /** Default border width reserved by table layout. */
  readonly defaultBorderWidth: number;
  /**
   * Whether a table wider than the rect shrinks into it. Set inside multi-column
   * flows, where an overflowing table would cover the neighbouring column.
   */
  readonly fitToWidth?: boolean | undefined;
}

/** Normalized table source consumed by renderer-neutral table layout. */
export interface QuireTableSource {
  /** Stable table id within the owning layout snapshot. */
  readonly tableId: string;
  /** Document range represented by the table node. */
  readonly tableRange: QuireDocumentRange;
  /** Source rows in document order. */
  readonly rows: readonly QuireTableSourceRow[];
  /** Source columns in grid order. */
  readonly columns: readonly QuireTableSourceColumn[];
  /** Preferred normalized table width, or null when unresolved. */
  readonly preferredWidth: QuireTableLength | null;
  /** Declared grid sizing authority preserved from the source table. */
  readonly layoutMode: QuireTableLayoutMode | null;
  /** Horizontal table alignment within the containing block. */
  readonly alignment: QuireTableAlignment | null;
  /** Table indent from the containing block start edge. */
  readonly tableIndent: QuireTableLength | null;
  /** Table-level default margins inherited by cells when no direct margin exists. */
  readonly defaultCellMargins: QuireTableCellMargins | null;
  /** Table-level cell spacing preserved for later separated-border layout. */
  readonly cellSpacing: QuireTableLength | null;
  /** Table-level outside and inside borders preserved from the source table. */
  readonly borders: QuireTableBorders | null;
  /** Optional out-of-flow anchor placement for a floating table. */
  readonly floating?: QuireTableFloatingPlacement | null | undefined;
  /** Optional value formatters available to scalar table sources. */
  readonly formatters?: readonly QuireTableValueFormatter[] | undefined;
  /** Semantic cells in source order. */
  readonly semanticCells: readonly QuireTableSourceCell[];
  /** Diagnostics carried through from the source table map. */
  readonly diagnostics: readonly QuireTableDiagnostic[];
  /** Resolved C1 table-level style. */
  readonly style: QuireResolvedTableStyle;
  /**
   * Whether automatic rows take only their content height, as the producer of an imported table lays them out,
   * instead of rising to the authoring default row height.
   */
  readonly contentSizedRows?: boolean | undefined;
}

/** Normalized row data consumed by table layout. */
export interface QuireTableSourceRow {
  /** Stable source row id. */
  readonly id: string;
  /** Zero-based row index. */
  readonly rowIndex: number;
  /** Table-relative source position of the row. */
  readonly rowPos: number;
  /** Omitted grid columns before the first explicit cell. */
  readonly gridBefore: QuireTableGridOffset;
  /** Omitted grid columns after the last explicit cell. */
  readonly gridAfter: QuireTableGridOffset;
  /** Whether the row is marked as a repeated header row. */
  readonly isHeader: boolean;
  /** Direct normalized row height, or null when automatic or inherited. */
  readonly height: QuireTableRowHeight | null;
  /** Whether the row requests no page split. */
  readonly cantSplit: boolean;
  /** Row-specific cell spacing preserved for later separated-border layout. */
  readonly cellSpacing: QuireTableLength | null;
  /** Row-level border metadata preserved for shared-edge conflict resolution. */
  readonly borders?: QuireTableBorders | null | undefined;
}

/** Normalized column data consumed by table layout. */
export interface QuireTableSourceColumn {
  /** Stable source column id. */
  readonly id: string;
  /** Zero-based column index. */
  readonly columnIndex: number;
  /** Preferred normalized width, or null when unresolved. */
  readonly width: QuireTableLength | null;
}

/** Normalized semantic cell data consumed by table layout. */
export interface QuireTableSourceCell {
  /** Stable semantic cell id. */
  readonly id: string;
  /** Explicit origin cell id. */
  readonly originExplicitCellId: string;
  /** Explicit source cell ids owned by this semantic cell. */
  readonly explicitCellIds: readonly string[];
  /** Table-relative source position of the origin explicit cell. */
  readonly originCellPos: number;
  /** Normalized table grid rectangle occupied by the semantic cell. */
  readonly gridRect: QuireTableGridRect;
  /** Absolute document range of the cell's editable block content. */
  readonly contentRange: QuireDocumentRange;
  /** Cell shading preserved from the source cell, if any. */
  readonly shading: QuireTableShading | null;
  /** CSS-compatible cell background-color shortcut, if any. */
  readonly backgroundColor: string | null;
  /** Cell outside borders preserved from the source cell, if any. */
  readonly borders: QuireTableBorders | null;
  /** Table-style cell borders on this cell's edges, ranked below direct cell borders. */
  readonly styleBorders?: QuireTableBorders | null | undefined;
  /** Cell-specific margins preserved from the source cell, if any. */
  readonly cellMargins: QuireTableCellMargins | null;
  /** Preferred normalized cell width, or null when unresolved. */
  readonly preferredWidth: QuireTableLength | null;
  /** Whether inline wrapping is disabled for this cell. */
  readonly noWrap: boolean | null;
  /** Vertical alignment for content inside this cell. */
  readonly verticalAlign: QuireTableVerticalAlignment | null;
  /** Optional formatted scalar-cell data reserved for later slices. */
  readonly formatted: QuireTableFormattedCell | null;
}

/** Formatted scalar-cell data kept separate from painted display text. */
export interface QuireTableFormattedCell {
  /** Raw source value, or null for rich document cell content. */
  readonly rawValue: QuireTableCellValue | null;
  /** Text representation used when editing the scalar value. */
  readonly editText: string;
  /** Formatted text representation used for layout and paint. */
  readonly displayText: string;
  /** Format specification that produced the display text. */
  readonly formatSpec: QuireTableCellFormatSpec | null;
}

/** Input passed to a table value formatter. */
export interface QuireTableValueFormatterInput {
  /** Raw scalar value to format. */
  readonly rawValue: QuireTableCellValue;
  /** Text representation used while editing the value. */
  readonly editText: string;
  /** Format specification requested by the table source. */
  readonly formatSpec: QuireTableCellFormatSpec | null;
  /** Preferred locale for locale-aware formatting, or null when unspecified. */
  readonly locale: string | null;
}

/** Result returned by a table value formatter. */
export interface QuireTableValueFormatterResult {
  /** Text representation used for layout and paint. */
  readonly displayText: string;
  /** Optional normalized edit text returned by the formatter. */
  readonly editText?: string | undefined;
  /** Optional normalized format specification returned by the formatter. */
  readonly formatSpec?: QuireTableCellFormatSpec | null | undefined;
  /** Source-specific formatter payload preserved for round-trip capable targets. */
  readonly preservation?: Readonly<Record<string, unknown>> | undefined;
}

/** Formatter used by scalar table sources to create display text. */
export interface QuireTableValueFormatter {
  /**
   * Formats one raw table cell value into display text.
   *
   * @param input - Raw value, edit text, format spec, and locale.
   * @returns Formatter result, or null when this formatter does not apply.
   */
  format(input: QuireTableValueFormatterInput): QuireTableValueFormatterResult | null;
}

/** Scalar value kind supported by the table rendering contract. */
export type QuireTableCellValueKind =
  | "empty"
  | "text"
  | "number"
  | "date"
  | "boolean"
  | "rich";

/** Raw scalar value carried by a formatted table cell. */
export interface QuireTableCellValue {
  /** Raw value kind. */
  readonly kind: QuireTableCellValueKind;
  /** Source value before formatting. */
  readonly value: unknown;
}

/** Format specifier carried by a formatted table cell. */
export interface QuireTableCellFormatSpec {
  /** Broad formatter family. */
  readonly kind: "plain" | "number" | "currency" | "percent" | "date" | "custom";
  /** Locale used by the formatter, when known. */
  readonly locale?: string;
  /** Source format code, when preserved. */
  readonly code?: string;
  /** Currency code used by currency formats, when known. */
  readonly currency?: string;
  /** Source-specific preservation payload. */
  readonly preservation?: Readonly<Record<string, unknown>>;
}

/** C1 table-level style resolved for layout and paint. */
export interface QuireResolvedTableStyle {
  /** Table background color, or null for the default document fill. */
  readonly backgroundColor: string | null;
  /** Default border color used by C1 solid borders. */
  readonly borderColor: string;
  /** Default border width used by C1 solid borders. */
  readonly borderWidth: number;
}

/** Physical table edge represented by a border candidate or segment. */
export type QuireTablePhysicalEdge = "top" | "right" | "bottom" | "left";

/** Source family that contributed a table border candidate. */
export type QuireTableBorderCandidateSource =
  | "table"
  | "inside"
  | "row"
  | "styleCell"
  | "cell"
  | "pageBreak";

/** Border line segment in document coordinates. */
export interface QuireTableLineSegment {
  /** Segment start point in document coordinates. */
  readonly from: QuirePoint;
  /** Segment end point in document coordinates. */
  readonly to: QuirePoint;
}

/** Candidate border competing for one physical table edge segment. */
export interface QuireTableBorderCandidate {
  /** Stable candidate id, used when this candidate wins resolution. */
  readonly id: string;
  /** Physical edge represented by the candidate. */
  readonly edge: QuireTablePhysicalEdge;
  /** Source border value, or null when the source explicitly clears it. */
  readonly border: QuireTableBorder | null;
  /** Source family that produced the candidate. */
  readonly source: QuireTableBorderCandidateSource;
  /** Source priority used after border concreteness and width tie-breakers. */
  readonly priority: number;
  /** Stable owner id used for diagnostics and hit metadata. */
  readonly ownerId: string;
  /**
   * Cell edge the candidate speaks for. Candidates of one edge settle by priority first, so a direct nil hides only
   * that cell's side; edges of adjacent cells then compete on visibility and width. Absent means one shared edge.
   */
  readonly edgeOwnerId?: string | undefined;
  /** Physical line occupied by the candidate in document coordinates. */
  readonly line: QuireTableLineSegment;
}

/** Resolved border segment ready for paint and hit testing. */
export interface QuireResolvedTableBorderSegment {
  /** Stable resolved segment id. */
  readonly id: string;
  /** Physical edge represented by the resolved segment. */
  readonly edge: QuireTablePhysicalEdge;
  /** Winning normalized border value. */
  readonly border: QuireTableBorder;
  /** Resolved line segment in document coordinates. */
  readonly line: QuireTableLineSegment;
  /** Tight paint rectangle occupied by the stroke. */
  readonly paintRect: QuireRect;
  /** Larger hit rectangle used by resize and chrome interactions. */
  readonly hitRect: QuireRect;
  /** Candidate owner ids that contributed to this physical segment. */
  readonly owners: readonly string[];
  /** Stroke style consumed by renderer display commands. */
  readonly strokeStyle: string;
  /** Stroke width in CSS pixels. */
  readonly lineWidth: number;
  /** Optional stroke dash pattern in CSS pixels. */
  readonly lineDash?: readonly number[];
}

/** Options used to resolve table border candidates into paint segments. */
export interface QuireTableBorderResolutionOptions {
  /** Table layout snapshot that owns generated fallback candidates. */
  readonly snapshot: QuireTableGeometrySnapshot;
  /** Optional explicit candidates; omitted for C1 geometry fallback borders. */
  readonly candidates?: readonly QuireTableBorderCandidate[];
}

/** Measured recursive content returned for one table cell. */
export interface QuireTableCellContentLayout {
  /** Measured content height in CSS pixels. */
  readonly height: number;
}

/**
 * Measures recursive content for a table cell at its resolved content rectangle.
 *
 * @param cell - Source semantic cell to measure.
 * @param contentRect - Resolved content rectangle for the cell.
 * @returns Measured cell content geometry.
 */
export type QuireTableCellContentMeasurer = (
  cell: QuireTableSourceCell,
  contentRect: QuireRect
) => QuireTableCellContentLayout;

/** Resolved physical grid column track. */
export interface QuireTableGridTrack {
  /** Stable track id. */
  readonly id: string;
  /** Zero-based column index. */
  readonly columnIndex: number;
  /** Track left edge in document coordinates. */
  readonly x: number;
  /** Track width in CSS pixels. */
  readonly width: number;
}

/** Consumer-neutral row geometry. */
export interface QuireTableRowGeometry {
  /** Stable row geometry id. */
  readonly id: string;
  /** Source row id represented by this fragment. */
  readonly sourceRowId: string;
  /** Zero-based source row index. */
  readonly rowIndex: number;
  /** Whether this row is eligible to repeat as a header on continuation pages. */
  readonly isHeader: boolean;
  /** Whether this row requests no page split. */
  readonly cantSplit: boolean;
  /** Omitted grid columns before the first explicit cell. */
  readonly gridBefore?: QuireTableGridOffset | undefined;
  /** Omitted grid columns after the last explicit cell. */
  readonly gridAfter?: QuireTableGridOffset | undefined;
  /** Row-level border metadata preserved for border resolution. */
  readonly borders?: QuireTableBorders | null | undefined;
  /** Resolved separated-border spacing applied to this row's cell boxes. */
  readonly cellSpacing?: number | undefined;
  /** Document range covered by the row's editable cell content. */
  readonly range: QuireDocumentRange;
  /** Row rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** Consumer-neutral cell geometry. */
export interface QuireTableCellGeometry {
  /** Stable cell geometry id. */
  readonly id: string;
  /** Semantic cell id represented by this fragment. */
  readonly semanticCellId: string;
  /** Explicit origin cell id represented by this fragment. */
  readonly originExplicitCellId: string;
  /** Explicit source cell ids owned by this fragment. */
  readonly explicitCellIds: readonly string[];
  /** Source-relative position of the origin explicit cell. */
  readonly originCellPos: number;
  /** Document range covered by this cell's editable content. */
  readonly range: QuireDocumentRange;
  /** Cell shading preserved for paint. */
  readonly shading: QuireTableShading | null;
  /** CSS-compatible cell background-color shortcut preserved for paint. */
  readonly backgroundColor?: string | null | undefined;
  /** Cell border metadata preserved for border resolution. */
  readonly borders: QuireTableBorders | null;
  /** Table-style cell borders, ranked below direct cell borders. */
  readonly styleBorders?: QuireTableBorders | null | undefined;
  /** Cell-specific margins preserved for layout metadata. */
  readonly cellMargins: QuireTableCellMargins | null;
  /** Preferred normalized cell width. */
  readonly preferredWidth?: QuireTableLength | null | undefined;
  /** Whether wrapping is disabled for this cell. */
  readonly noWrap?: boolean | null | undefined;
  /** Vertical content alignment. */
  readonly verticalAlign?: QuireTableVerticalAlignment | null | undefined;
  /** Grid rectangle occupied by the cell. */
  readonly gridRect: QuireTableGridRect;
  /** Full cell rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Content rectangle inside padding and border. */
  readonly contentRect: QuireRect;
  /** Whether intrinsic content exceeds the fixed cell frame and requires partial-line clipping. */
  readonly clipsOverflow?: boolean | undefined;
  /** Optional layout origin for vertically aligned cell content. */
  readonly contentLayoutRect?: QuireRect | undefined;
}

/** Source-flow measurements, independent of page fragments, zoom and placement. */
export interface QuireTableSizing {
  /** Actual outer table width in CSS pixels. */
  readonly width: number;
  /** Actual logical column widths in source order, excluding separated gaps. */
  readonly columnWidths: readonly number[];
  /** Actual source row heights, excluding separated gaps and repeated headers. */
  readonly rowHeights: readonly number[];
  /** Content plus vertical inset constraints for each semantic cell. */
  readonly cellMinimumHeights: readonly {
    /** First covered source row. */
    readonly startRow: number;
    /** Number of covered source rows. */
    readonly rowSpan: number;
    /** Required outer height in CSS pixels, without alignment slack. */
    readonly height: number;
  }[];
}

/** Consumer-neutral table geometry snapshot. */
export interface QuireTableGeometrySnapshot {
  /** Complete source-flow sizing retained unchanged during page projection. */
  readonly sizing?: QuireTableSizing | undefined;
  /** Stable table id. */
  readonly tableId: string;
  /** Stable geometry identity used by paint and View projection. */
  readonly geometryId: string;
  /** Document range represented by the table. */
  readonly tableRange: QuireDocumentRange;
  /** Resolved table-level style used by paint. */
  readonly style: QuireResolvedTableStyle;
  /** Table-level border metadata used by border graph resolution. */
  readonly borders: QuireTableBorders | null;
  /** Resolved table-level cell spacing applied by C1 separated geometry. */
  readonly cellSpacing?: number | undefined;
  /** Table rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Resolved grid tracks. */
  readonly tracks: readonly QuireTableGridTrack[];
  /** Row fragments in visual order. */
  readonly rows: readonly QuireTableRowGeometry[];
  /** Cell geometry in source order. */
  readonly cells: readonly QuireTableCellGeometry[];
}

/** Renderer-neutral C1 table paint model. */
export interface QuireTablePaintModel {
  /** Background fills emitted before content. */
  readonly backgrounds: readonly QuireTableBackgroundPaint[];
  /** Cell content clips emitted around recursive cell content. */
  readonly contentClips: readonly QuireTableContentClip[];
  /** Solid C1 border strokes emitted after content. */
  readonly borders: readonly QuireTableBorderPaint[];
}

/** Table or cell background paint descriptor. */
export interface QuireTableBackgroundPaint {
  /** Stable paint id. */
  readonly id: string;
  /** Document range represented by the background. */
  readonly range: QuireDocumentRange;
  /** Background rectangle in document coordinates. */
  readonly rect: QuireRect;
  /** Fill style consumed by renderer display commands. */
  readonly fillStyle: string;
}

/** Cell content clip descriptor. */
export interface QuireTableContentClip {
  /** Stable clip id. */
  readonly id: string;
  /** Semantic cell id owning the clip. */
  readonly semanticCellId: string;
  /** Clip rectangle in document coordinates. */
  readonly rect: QuireRect;
}

/** C1 solid border paint descriptor. */
export interface QuireTableBorderPaint {
  /** Stable border paint id. */
  readonly id: string;
  /** Border start point in document coordinates. */
  readonly from: QuirePoint;
  /** Border end point in document coordinates. */
  readonly to: QuirePoint;
  /** Stroke style consumed by renderer display commands. */
  readonly strokeStyle: string;
  /** Stroke width in CSS pixels. */
  readonly lineWidth: number;
  /** Optional stroke dash pattern in CSS pixels. */
  readonly lineDash?: readonly number[];
  /** Optional stroke cap style used to join adjacent border segments. */
  readonly lineCap?: QuireLineCap;
}
