import type { Tree } from "@lezer/common";

/** A committed root-level adoption in the new document's coordinates. */
export interface BlockReuseRange {
  /** Inclusive new-source start. */
  readonly from: number;
  /** Exclusive new-source end. */
  readonly to: number;
  /** Old-source position minus new-source position. */
  readonly offset: number;
}

/** Optional evidence produced after the parser's native rollback decisions. */
export interface BlockReuse {
  /** Number of committed root-level adoption events. */
  readonly count: number;
  /**
   * Looks up adoptions from the exact old root without retaining that root.
   * @param previous - Exact fragment input root.
   * @returns Adopted new-coordinate ranges, when observed.
   */
  get(previous: Tree): readonly BlockReuseRange[] | undefined;
}

/** Weakly held origins accumulated by one parser run. */
export type BlockReuseOrigins = WeakMap<Tree, BlockReuseRange[]>;
