/** A complete source-flow band with its local physical page. */
export interface QuireSourceFlowPageBand {
  /** Source-flow start, independent of the projected physical page origin. */
  readonly from: number;
  /** Source-flow end. */
  readonly to: number;
  /** Zero-based section-local page index. */
  readonly pageIndex: number;
}
