/** Physical paper configuration, independent of any editor viewport. */
export interface FlowchartPageSettings {
  /** ISO paper size. */ readonly paper: "A4" | "A3";
  /** Paper orientation. */ readonly orientation: "portrait" | "landscape";
  /** Physical whitespace in millimetres. */ readonly margins: FlowchartPageMargins;
  /** Fit the complete drawing on one sheet, or fixed CSS-pixel-to-paper scale. */ readonly scale: "fit" | number;
}
/** Physical content insets in millimetres. */
export interface FlowchartPageMargins {
  /** Top inset. */ readonly top: number;
  /** Right inset. */ readonly right: number;
  /** Bottom inset. */ readonly bottom: number;
  /** Left inset. */ readonly left: number;
}
/** Source SVG bounds, including labels and routed connections. */
export interface FlowchartPageBounds {
  /** Left edge in graph coordinates. */ readonly x: number;
  /** Top edge in graph coordinates. */ readonly y: number;
  /** Graph-coordinate width. */ readonly width: number;
  /** Graph-coordinate height. */ readonly height: number;
}
/** One contiguous graph-coordinate crop, in row-major print order. */
export interface FlowchartPage extends FlowchartPageBounds {
  /** Zero-based output position. */ readonly index: number;
  /** Zero-based grid row. */ readonly row: number;
  /** Zero-based grid column. */ readonly column: number;
}
/** Deterministic bounded print plan for a frozen drawing. */
export interface FlowchartPagePlan {
  /** Validated physical configuration. */ readonly settings: FlowchartPageSettings;
  /** Physical paper width in millimetres. */ readonly paperWidth: number;
  /** Physical paper height in millimetres. */ readonly paperHeight: number;
  /** Resolved scale at 96 CSS pixels per inch. */ readonly scale: number;
  /** Grid row count. */ readonly rows: number;
  /** Grid column count. */ readonly columns: number;
  /** Ordered crops, limited to 100 sheets. */ readonly pages: readonly FlowchartPage[];
}
