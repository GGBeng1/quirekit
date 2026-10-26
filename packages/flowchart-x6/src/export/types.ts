/** Bounded image appearance; these settings do not change the diagram source. */
export interface FlowchartImageOptions {
  /** Requested PNG pixels per world CSS pixel, in (0, 8]; defaults to 2. */ readonly scale?: number;
  /** Opaque six-digit HEX background; omission preserves transparency. */ readonly background?: string;
}
/** Actual PNG allocation after applying both browser memory and side-length budgets. */
export interface FlowchartImageSize {
  /** Allocated pixel width. */ readonly width: number;
  /** Allocated pixel height. */ readonly height: number;
  /** Effective scale before integer rounding. */ readonly scale: number;
  /** Whether the requested scale exceeded a budget. */ readonly limited: boolean;
}
