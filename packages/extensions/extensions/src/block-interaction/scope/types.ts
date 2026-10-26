import type { Node as PMNode } from "@quirekit/pm";

/** Cached direct child facts in their immutable scope's relative coordinates. */
export interface ScopeBlockEntry {
  /** Canonical immutable block. */
  readonly node: PMNode;
  /** Stable identity stored on this block. */
  readonly blockId: string;
  /** Original child order, including unsupported siblings. */
  readonly order: number;
  /** Offset within the owning scope content. */
  readonly offset: number;
}
