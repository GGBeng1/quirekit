import type { QuireKitControlSize } from "../control";

/** One flat display column with optional explicit sorting semantics. */
export interface QuireKitTableColumn<Row> {
  /** Stable identity used for the header and named slots. */
  readonly id: string;
  /** Human-readable column heading. */
  readonly title: string;
  /** Direct row property; omit for an action or accessor column. */
  readonly field?: keyof Row;
  /** Derived display value, taking precedence over field. */
  readonly value?: (row: Row) => unknown;
  /** Optional CSS width; long content wraps within it. */
  readonly width?: string;
  /** Logical text alignment, including numeric end alignment. */
  readonly align?: "start" | "center" | "end";
  /** Enable a sort request; defaults to true when compare is supplied. */
  readonly sortable?: boolean;
  /** Ascending row comparator, required for local sorting; owns null and locale rules. */
  readonly compare?: (left: Row, right: Row) => number;
  /** Render body cells as scoped row headings. */
  readonly rowHeader?: boolean;
}

/** Stable business identity; never a position in the currently displayed page. */
export type QuireKitTableRowKey<Row> = keyof Row | ((row: Row) => string | number);

/** Single-column sort state; null clears the ordering. */
export interface QuireKitTableSorting {
  /** Stable column identity. */
  readonly columnId: string;
  /** Requested ordering direction. */
  readonly direction: "asc" | "desc";
}

/** Header slot contract; custom headings own their sort control placement. */
export interface QuireKitTableHeaderContext<Row> {
  /** Original column definition. */
  readonly column: QuireKitTableColumn<Row>;
  /** Effective direction for this column, or null when unsorted. */
  readonly direction: "asc" | "desc" | null;
  /** Whether this column accepts sorting. */
  readonly sortable: boolean;
  /** Sorting is temporarily disabled while loading. */
  readonly disabled: boolean;
  /** Advance ascending, descending, then unsorted; ignored when disabled. */
  readonly toggleSorting: () => void;
  /** Shared size for composed controls. */
  readonly size: QuireKitControlSize;
}

/** Public generic display-table contract, independent of the row-model engine. */
export interface QuireKitTableProps<Row> {
  /** Displayed page in manual mode, or complete unpaged data in local sorting mode. */
  readonly rows: readonly Row[];
  /** Ordered display columns. */
  readonly columns: readonly QuireKitTableColumn<Row>[];
  /** Unique stable business key. Duplicate or missing keys are rejected. */
  readonly rowKey: QuireKitTableRowKey<Row>;
  /** Accessible name when a visible caption is unnecessary. */
  readonly label?: string;
  /** ID of an existing visible heading that names the table. */
  readonly labelledby?: string;
  /** Visible caption, also naming the table. */
  readonly caption?: string;
  /** Shared typography and cell spacing; rows remain naturally sized. */
  readonly size?: QuireKitControlSize;
  /** Keep column headings within this table's scrolling viewport. */
  readonly stickyHeader?: boolean;
  /** Host-selected viewport maximum height; unconstrained by default. */
  readonly maxHeight?: string;
  /** Host-selected minimum table width for horizontal scrolling. */
  readonly minWidth?: string;
  /** Loading preserves existing rows and exposes aria-busy. */
  readonly loading?: boolean;
  /** Controlled single-column sorting; null explicitly means unsorted. */
  readonly sorting?: QuireKitTableSorting | null;
  /** Initial uncontrolled sorting, read only at creation. */
  readonly defaultSorting?: QuireKitTableSorting | null;
  /** Manual only emits requests; local orders complete rows using column comparators. */
  readonly sortingMode?: "manual" | "local";
  /** Add a checkbox selection column; whole-row clicks do not select. */
  readonly selectable?: boolean;
  /** Controlled selected business keys, including keys outside the displayed page. */
  readonly selectedKeys?: readonly string[];
  /** Initial uncontrolled selected keys, read only at creation. */
  readonly defaultSelectedKeys?: readonly string[];
  /** Decide which displayed rows can be toggled by the user. */
  readonly rowSelectable?: (row: Row) => boolean;
  /** Readable row identity in selection labels; defaults to the business key. */
  readonly rowLabel?: (row: Row) => string;
  /** Currently inspected row, distinct from selectable rows. */
  readonly currentRowKey?: string | number | null;
}

/** Values available to shared and per-column cell slots. */
export interface QuireKitTableCellContext<Row> {
  /** Original host row, with its generic type retained. */
  readonly row: Row;
  /** Resolved column configuration. */
  readonly column: QuireKitTableColumn<Row>;
  /** Accessor result or direct property value. */
  readonly value: unknown;
  /** Shared size for controls composed in this cell. */
  readonly size: QuireKitControlSize;
}

/** Theme-derived display table styling contract. */
export interface QuireKitTableTokens {
  /** Primary cell text. */
  readonly foreground: string;
  /** Quieter header and metadata text. */
  readonly mutedForeground: string;
  /** Opaque header surface for overlapping scrolled rows. */
  readonly headerBackground: string;
  /** Background identifying selected or currently inspected rows. */
  readonly currentBackground: string;
  /** Subtle horizontal row separation. */
  readonly borderColor: string;
  /** Shared default border width. */
  readonly borderWidth: string;
  /** Compact cell inset. */
  readonly compactPadding: string;
  /** Ordinary cell inset. */
  readonly padding: string;
  /** Comfortable cell inset. */
  readonly comfortablePadding: string;
}
