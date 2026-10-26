/** Two-dimensional chart families admitted by the current basic preset. */
export type ChartType = "column" | "bar" | "line" | "area" | "pie" | "doughnut";

/** Common grouping; standard maps to clustered only for bars and columns. */
export type ChartGrouping = "standard" | "stacked" | "percentStacked";

/** Portable visual properties with explicit Word-compatible fields. */
export interface ChartPresentation {
  /** Plain title; an empty string suppresses the title object. */
  readonly title: string;
  /** Non-overlapping legend position, or complete suppression. */
  readonly legend: "none" | "top" | "bottom" | "left" | "right";
  /** Show original numeric values using the admitted family label placement. */
  readonly dataLabels: boolean;
  /** Show category labels and axis line; circular presets require false. */
  readonly categoryAxis: boolean;
  /** Show value labels and axis line; circular presets require false. */
  readonly valueAxis: boolean;
  /** Show major value gridlines independently of axis-label visibility. */
  readonly gridlines: boolean;
}

/** One stable typed data column. */
export interface ChartColumn {
  /** Stable column identity. */
  readonly id: string;
  /** Editable display name. */
  readonly name: string;
  /** Category strings or numeric data. */
  readonly type: "string" | "number";
}

/** One logical row; null retains its position without inventing a zero. */
export interface ChartRow {
  /** Stable row identity, independent of display order. */
  readonly id: string;
  /** Exact values indexed by column identity. */
  readonly values: Readonly<Record<string, string | number | null>>;
}

/** One independently identified series and its column bindings. */
export interface ChartSeries {
  /** Stable series identity. */
  readonly id: string;
  /** Legend and workbook heading. */
  readonly name: string;
  /** String category column. */
  readonly categoryColumn: string;
  /** Finite-number/null value column. */
  readonly valueColumn: string;
}

/** Portable chart authority; renderers and workbooks are derived products. */
export interface ChartSpec {
  /** Current format marker, fixed during development until a released format changes. */
  readonly version: 1;
  /** Stable content identity referenced by document objects. */
  readonly id: string;
  /** Positive revision used to detect stale drafts. */
  readonly revision: number;
  /** Admitted plot family. */
  readonly type: ChartType;
  /** Complete grouping tuple, separate from the family and series bindings. */
  readonly grouping: ChartGrouping;
  /** Explicit title, legend, label and axis settings. */
  readonly presentation: ChartPresentation;
  /** Complete data table, with independent row/column identities. */
  readonly data: {
    /** Ordered stable columns. */
    readonly columns: readonly ChartColumn[];
    /** Ordered logical rows. */
    readonly rows: readonly ChartRow[];
  };
  /** Ordered plot series, separate from table columns. */
  readonly series: readonly ChartSeries[];
  /** Complete current style preset. */
  readonly style: {
    /** Atomic style preset; unrelated defaults are never combined. */
    readonly presetId: "simple-1";
    /** Explicit opaque sRGB colors. */
    readonly palette: readonly string[];
    /** Document typography role resolved at render time. */
    readonly fontRole: "body";
  };
  /** Requested source size in CSS pixels. */
  readonly extent: {
    /** Requested inline size. */
    readonly width: number;
    /** Requested block size. */
    readonly height: number;
  };
  /** Explicit BCP-47 document language. */
  readonly locale: string;
  /** Drawing treatment of missing values; raw null and sparse caches remain intact. */
  readonly blankPolicy: "gap" | "zero";
}

/** Structured rejection usable by public commands and data editors. */
export interface ChartDiagnostic {
  /** Stable failure code. */
  readonly code: string;
  /** Exact field path. */
  readonly path: string;
  /** Human-readable explanation. */
  readonly message: string;
}
