import type { QuireKitTreeNode } from "@quirekit/ui";

/** One confirmed Markdown heading, in document order. */
export interface MdOutlineEntry {
  /** Outline node id, derived from the heading's source start. */
  readonly id: string;
  /** Markdown heading depth, from one through six. */
  readonly level: number;
  /** Visible heading text without Markdown syntax. */
  readonly text: string;
  /** Source position where the heading starts. */
  readonly from: number;
}

/** Nested TreeView projection of flat outline entries. */
export interface MdOutlineTree {
  /** Root TreeView nodes in document order. */
  readonly nodes: readonly QuireKitTreeNode[];
  /** Ids of every node that has children. */
  readonly branches: readonly string[];
}
