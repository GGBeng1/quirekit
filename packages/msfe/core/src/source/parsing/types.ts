import type { Tree } from "@lezer/common";
import type { MsfeSourceRange } from "../../views/types";

/** Actual native chunk comparison work along one accepted state lineage. */
export interface SyntaxChangeWork {
  /** Distinct before/after comparisons, shared by all presentation consumers. */
  builds: number;
  /** Current chunks visited before skipping reused subtrees. */
  visitedChunks: number;
  /** Previous-tree paths checked for exact identity and position. */
  comparedChunks: number;
  /** Adopted-range checks while skipping current chunks. */
  reuseChecks: number;
  /** Proof/gap pairs checked against the exact transaction mapping. */
  reuseMappings: number;
}

/** A committed root-level range with an exact old-coordinate translation. */
export interface SyntaxReuseRange extends MsfeSourceRange {
  /** Old source position minus new source position throughout this range. */
  readonly offset: number;
}

/** Optional native observation; both current and previous root ownership are weak. */
export interface NativeSyntaxReuse {
  /** Number of committed root adoption events, including all fragment origins. */
  readonly count: number;
  /** @param previous - Exact fragment root. @returns Accepted ranges in current coordinates. */
  get(previous: Tree): readonly SyntaxReuseRange[] | undefined;
}

/** Work introduced by native proof observation and reference-pass composition. */
export interface SyntaxReuseWork {
  /** Committed root adoption events in both native passes. */
  adoptedRanges: number;
  /** Ordered range pairs checked while composing the two passes. */
  composedRanges: number;
}

/** Weakly owned comparison result; source content remains in CodeMirror. */
export interface SyntaxChangeCache {
  /** Previously accepted immutable parse. */
  readonly before: Tree;
  /** Newly accepted immutable parse. */
  readonly after: Tree;
  /** Disjoint invalidation intervals in new coordinates. */
  readonly ranges: readonly MsfeSourceRange[];
}

/** One retained old-tree ancestor during an ordered comparison; never survives the diff. */
export interface SyntaxChunkPath {
  /** Immutable old parse node. */
  readonly tree: Tree;
  /** Node origin in old source coordinates. */
  readonly from: number;
}
