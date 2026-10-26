import type { BlockFact, BlockRangeRef } from "@quirekit/extensions";

/** Captured whole-block identity; selection changes cannot retarget it. */
export interface BlockActionTarget {
  /** Immutable block at the captured revision. */
  readonly block: BlockFact;
  /** Complete same-scope selection, in document order. */
  readonly blocks: readonly BlockFact[];
  /** Owner-validated source range. */
  readonly range: BlockRangeRef;
  /** Previous direct sibling, when one exists. */
  readonly previous?: BlockFact | undefined;
  /** Next direct sibling, when one exists. */
  readonly next?: BlockFact | undefined;
}

/** Product operations on one complete top-level block. */
export type BlockAction = "copy" | "cut" | "before" | "after" | "duplicate" | "delete" | "up" | "down";
