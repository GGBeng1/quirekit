import type {
  WordTableAlignment,
  WordTableBorder,
  WordTableBorderName,
  WordTableCellMargins,
  WordTableRowHeight,
  WordTableShading,
  WordTableUnknownRecord,
  WordTableVerticalAlignment,
  WordTableWidth
} from "../types";

/** Conditional table-style region, one per OOXML `ST_TblStyleOverrideType`. */
export type WordTableStyleRegionType =
  | "wholeTable"
  | "firstRow"
  | "lastRow"
  | "firstColumn"
  | "lastColumn"
  | "band1Vertical"
  | "band2Vertical"
  | "band1Horizontal"
  | "band2Horizontal"
  | "northWestCell"
  | "northEastCell"
  | "southWestCell"
  | "southEastCell";

/** Partial border map; an omitted side inherits, a `nil` border suppresses. */
export type WordTableStyleBorders = Readonly<
  Partial<Record<WordTableBorderName, WordTableBorder>>
>;

/** Partial margin map; an omitted side inherits. */
export type WordTableStyleMargins = Readonly<
  Partial<Record<keyof WordTableCellMargins, WordTableWidth>>
>;

/** Table-level properties a table style may contribute. */
export interface WordTableStyleTablePatch {
  /** Table borders mapped relative to the whole table. */
  readonly borders?: WordTableStyleBorders;
  /** Default cell margins. */
  readonly cellMargins?: WordTableStyleMargins;
  /** Table indentation from the leading margin. */
  readonly indent?: WordTableWidth;
  /** Table horizontal alignment. */
  readonly alignment?: WordTableAlignment;
  /** Table shading painted behind cells. */
  readonly shading?: WordTableShading;
  /** Default spacing between cells. */
  readonly cellSpacing?: WordTableWidth;
  /** Rows per horizontal band; zero disables row banding. */
  readonly rowBandSize?: number;
  /** Columns per vertical band; zero disables column banding. */
  readonly columnBandSize?: number;
}

/** Row-level properties a table style may contribute. */
export interface WordTableStyleRowPatch {
  /** Row height. */
  readonly height?: WordTableRowHeight;
  /** Whether rows avoid splitting across pages. */
  readonly cantSplit?: boolean;
  /** Whether rows repeat as header rows. */
  readonly isHeader?: boolean;
  /** Row horizontal alignment. */
  readonly alignment?: WordTableAlignment;
}

/** Cell-level properties a table style may contribute. */
export interface WordTableStyleCellPatch {
  /** Cell borders, including region-relative `insideH` and `insideV`. */
  readonly borders?: WordTableStyleBorders;
  /** Cell shading. */
  readonly shading?: WordTableShading;
  /** Cell margins. */
  readonly cellMargins?: WordTableStyleMargins;
  /** Vertical alignment. */
  readonly verticalAlign?: WordTableVerticalAlignment;
  /** Whether wrapping is disabled. */
  readonly noWrap?: boolean;
}

/**
 * One group of table-style properties. The style baseline and every
 * conditional region share this shape.
 */
export interface WordTableStyleFormatting {
  /** Table properties, or null when the group contributes none. */
  readonly table: WordTableStyleTablePatch | null;
  /** Row properties, or null when the group contributes none. */
  readonly row: WordTableStyleRowPatch | null;
  /** Cell properties, or null when the group contributes none. */
  readonly cell: WordTableStyleCellPatch | null;
  /** Paragraph delta in the Word Styles patch vocabulary, owned by that package. */
  readonly paragraph: WordTableUnknownRecord | null;
  /** Text delta in the Word Styles patch vocabulary, owned by that package. */
  readonly text: WordTableUnknownRecord | null;
}

/** One named Word table style definition. */
export interface WordTableStyleDefinition {
  /** Unique style id referenced by `wordTable.attrs.tableStyle`. */
  readonly id: string;
  /** Display name. */
  readonly name: string;
  /** Parent style id, or null for a root style. */
  readonly basedOn: string | null;
  /** Whether this is the document default table style. */
  readonly isDefault: boolean;
  /** Whether the style was defined by a user or producer rather than built in. */
  readonly custom: boolean;
  /** Gallery sort priority, or null when unspecified. */
  readonly uiPriority: number | null;
  /** Whether the style is hidden from galleries. */
  readonly hidden: boolean;
  /** Whether the style stays hidden until first use. */
  readonly semiHidden: boolean;
  /** Baseline applied to every cell before conditional regions. */
  readonly base: WordTableStyleFormatting;
  /** Conditional region deltas keyed by region type. */
  readonly regions: Readonly<
    Partial<Record<WordTableStyleRegionType, WordTableStyleFormatting>>
  >;
}

/** Document-level table style registry stored in `doc.attrs.wordTableStyleRegistry`. */
export interface WordTableStyleRegistry {
  /** Registry schema version. */
  readonly version: 1;
  /** Style definitions keyed by id. */
  readonly styles: Readonly<Record<string, WordTableStyleDefinition>>;
  /** Default table style id, or null when the document declares none. */
  readonly defaultStyleId: string | null;
}

/** Effective conditional-formatting switches for one table instance. */
export interface WordTableStyleLook {
  /** Header-row formatting. */
  readonly firstRow: boolean;
  /** Total-row formatting. */
  readonly lastRow: boolean;
  /** First-column formatting. */
  readonly firstColumn: boolean;
  /** Last-column formatting. */
  readonly lastColumn: boolean;
  /** Horizontal banding. */
  readonly bandedRows: boolean;
  /** Vertical banding. */
  readonly bandedColumns: boolean;
}

/** Style chain compiled base-to-leaf with `wholeTable` folded into the base. */
export interface ResolvedWordTableStyle {
  /** Style ids that contributed, base to leaf. */
  readonly chain: readonly string[];
  /** Effective baseline. */
  readonly base: WordTableStyleFormatting;
  /** Effective conditional deltas, excluding `wholeTable`. */
  readonly regions: Readonly<
    Partial<Record<WordTableStyleRegionType, WordTableStyleFormatting>>
  >;
}

/** Style-derived appearance for one semantic table cell. */
export interface WordTableStyleCellAppearance {
  /** Semantic cell id from the table map. */
  readonly semanticCellId: string;
  /** Regions that applied to this cell, in application order. */
  readonly regions: readonly WordTableStyleRegionType[];
  /** Style cell borders on this cell's physical edges. */
  readonly borders: WordTableStyleBorders;
  /** Style shading, when any region contributed one. */
  readonly shading: WordTableShading | null;
  /** Style cell margins merged from the baseline and row-scoped regions. */
  readonly cellMargins: WordTableStyleMargins;
  /** Style vertical alignment, when contributed. */
  readonly verticalAlign: WordTableVerticalAlignment | null;
  /** Style no-wrap flag, when contributed. */
  readonly noWrap: boolean | null;
  /** Merged paragraph delta for paragraphs in this cell. */
  readonly paragraph: WordTableUnknownRecord | null;
  /** Merged text delta for runs in this cell. */
  readonly text: WordTableUnknownRecord | null;
}

/** Style-derived appearance for one table instance. */
export interface WordTableStyleAppearance {
  /** Effective style id after fallback, or null when no style applies. */
  readonly styleId: string | null;
  /** Effective look used for region classification. */
  readonly look: WordTableStyleLook;
  /** Style table properties (borders, margins, indent, alignment, shading). */
  readonly table: WordTableStyleTablePatch;
  /** Per-semantic-cell appearance keyed by semantic cell id. */
  readonly cells: ReadonlyMap<string, WordTableStyleCellAppearance>;
}

/** How applying a table style treats existing direct table formatting. */
export type WordTableStyleApplyMode = "clear-direct-formatting" | "keep-direct-formatting";

/** Options for applying one table style to a table node. */
export interface ApplyWordTableStyleOptions {
  /** Style id to apply. */
  readonly styleId: string;
  /** Direct-formatting policy; defaults to clearing, like Word's gallery click. */
  readonly mode?: WordTableStyleApplyMode | undefined;
  /** Look switches to change together with the style. */
  readonly look?: Partial<WordTableStyleLook> | undefined;
}

/** Options for changing the look switches of one table node. */
export interface SetWordTableLookOptions {
  /** Look switches to change; omitted switches keep their effective value. */
  readonly look: Partial<WordTableStyleLook>;
}
