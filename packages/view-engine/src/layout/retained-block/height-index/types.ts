/** One stable top-level flow extent stored by the height index. */
export interface QuireLayoutHeightIndexEntry {
  /** Stable retained block identity. */
  readonly id: string;
  /** Non-negative flow extent owned by the block. */
  readonly extent: number;
}

/** One indexed height delta applied as part of an atomic batch. */
export interface QuireLayoutHeightDelta {
  /** Zero-based flow-item index. */
  readonly index: number;
  /** Signed extent change. */
  readonly delta: number;
}

/** Result of reconciling current flow extents with the retained index. */
export interface QuireLayoutHeightIndexUpdate {
  /** Structural rebuild, same-order delta update, or unchanged index. */
  readonly mode: "rebuild" | "delta" | "noop";
  /** Number of entries rebuilt or updated. */
  readonly updatedEntries: number;
}

/** Internal prefix-sum authority for top-level retained flow. */
export interface QuireLayoutHeightIndex {
  /** Number of indexed flow items. */
  readonly size: number;

  /**
   * Reconciles stable ids and current extents.
   *
   * @param entries - Current top-level flow entries in document order.
   * @returns Structural or delta update facts.
   */
  reconcile(entries: readonly QuireLayoutHeightIndexEntry[]): QuireLayoutHeightIndexUpdate;

  /**
   * Applies one atomic batch of height deltas.
   *
   * @param deltas - Indexed signed extent changes.
   * @returns Nothing.
   */
  applyDeltas(deltas: readonly QuireLayoutHeightDelta[]): void;

  /**
   * Queries one block top relative to the indexed flow origin.
   *
   * @param index - Zero-based block index.
   * @returns Prefix extent before the block.
   */
  blockTop(index: number): number;

  /**
   * Queries the total indexed flow height.
   *
   * @returns Sum of all flow extents.
   */
  totalHeight(): number;

  /**
   * Maps a flow-relative offset to its owning block candidate.
   *
   * @param offset - Flow-relative vertical offset.
   * @returns Candidate block index, or undefined outside the indexed flow.
   */
  blockIndexAtOffset(offset: number): number | undefined;
}
