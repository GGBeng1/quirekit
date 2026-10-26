/** Complete table dimensions, independent of any document model. */
export interface QuireTableSize {
  /** Number of rows. */
  readonly rowCount: number;
  /** Number of columns. */
  readonly columnCount: number;
}
/** Host-localized picker copy. */
export interface QuireTableSizePickerLabels {
  /** Accessible panel name. */
  readonly title: string;
  /** Custom-size path. */
  readonly custom: string;
  /** Row count field. */
  readonly rows: string;
  /** Column count field. */
  readonly columns: string;
  /** Return to quick grid. */
  readonly back: string;
  /** Commit button. */
  readonly submit: string;
  /** Formats a complete tuple. @param size - Dimensions. @returns Accessible size label. */
  readonly size: (size: QuireTableSize) => string;
}
/** Public picker inputs; mutation and overlay lifecycle belong to the host. */
export interface QuireTableSizePickerProps {
  /** Localized accessible text. */
  readonly labels: QuireTableSizePickerLabels;
  /** Atomic initial tuple, default 2 by 2. */
  readonly initialSize?: QuireTableSize;
  /** Largest accepted row or column count, default 63. */
  readonly maxDimension?: number;
  /** Host blocks all submission while busy or read-only. */
  readonly disabled?: boolean;
  /** Host-owned failure feedback. */
  readonly error?: string;
}
/** Navigation keys owned by the quick grid. */
export type TableGridKey = "ArrowDown" | "ArrowLeft" | "ArrowRight" | "ArrowUp" | "End" | "Home";
