import type { ChartColumn, ChartSeries, ChartSpec } from "../model/types";
import type { MutableChartValue } from "../draft/types";

/** Stable raw-text row, allowing incomplete numeric input outside saved authority. */
export interface ChartDataTextRow {
  /** Host-allocated stable identity. */
  readonly id: string;
  /** Text indexed by stable column identity; an empty number represents null. */
  values: Record<string, string>;
}

/** Detached data editor contract, independent of grid, document and renderer. */
export interface ChartDataDraft {
  /** Ordered editable columns, independent of plotted series order. */
  columns: MutableChartValue<ChartColumn>[];
  /** Ordered raw-text data rows. */
  rows: ChartDataTextRow[];
  /** Explicit series identities and bindings. */
  series: MutableChartValue<ChartSeries>[];
}

/** Host allocation keeps the headless editor independent of browser crypto. */
export type ChartDataIdAllocator = (kind: "row" | "column" | "series") => string;

/** Valid data and series projection to merge with the unchanged chart properties. */
export type ChartDataValue = Pick<ChartSpec, "data" | "series">;

/** One exact stable-cell text edit. */
export interface ChartDataCellChange {
  /** Existing stable row identity. */
  readonly rowId: string;
  /** Existing stable column identity. */
  readonly columnId: string;
  /** Raw input, distinct from a persisted numeric value. */
  readonly text: string;
}
