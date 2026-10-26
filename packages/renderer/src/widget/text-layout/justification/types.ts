/** Derived placement of a wrapped slot, never persisted as document formatting. */
export interface TextSlotAlignment {
  /** Physical origin in unscaled local text coordinates. */
  readonly x: number;
  /** Occupied width after any safe spacing expansion. */
  readonly width: number;
  /** Layout-only advance deltas keyed by slot-local grapheme index. */
  readonly spacing: ReadonlyMap<number, number> | undefined;
}
