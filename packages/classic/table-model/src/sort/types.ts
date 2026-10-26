/** How a sort key is read from text, as Word's Sort dialog "Type". */
export type WordSortKeyType = "text" | "number" | "date";

/** Sort direction. */
export type WordSortOrder = "ascending" | "descending";

/** One sort key. */
export interface WordSortKey {
  /** Zero-based table grid column; paragraph sorts use the whole paragraph. */
  readonly column: number;
  /** How the key text is compared. */
  readonly type: WordSortKeyType;
  /** Sort direction of this key. */
  readonly order: WordSortOrder;
}

/** A parsed key value; null when the text holds no value of the key type. */
export type WordSortValue = string | number | null;

/** Request to sort the rows of one Word table. */
export interface SortWordTableRowsOptions {
  /** One to three keys, most significant first. */
  readonly keys: readonly WordSortKey[];
  /** Whether the first row is a header row kept in place. */
  readonly hasHeader: boolean;
}

/** Why a table cannot be sorted. */
export type WordTableSortRefusal =
  /** A cell spanning several rows lies in the sorted rows. */
  | "vertical-merge"
  /** A key names a column outside the table grid. */
  | "invalid-column"
  /** There are fewer than two rows to sort. */
  | "nothing-to-sort";
