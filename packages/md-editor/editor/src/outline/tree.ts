import type { QuireKitTreeNode } from "@quirekit/ui";
import type { MdOutlineEntry, MdOutlineTree } from "./types";

/** Mutable node used only while nesting. */
interface Draft {
  /** Stable TreeView id. */
  readonly id: string;
  /** Visible heading text. */
  readonly label: string;
  /** Heading depth used to find the parent. */
  readonly level: number;
  /** Nested headings in document order. */
  readonly children: Draft[];
}

/** @param draft - Nested draft. @returns Frozen TreeView node; leaves carry no children array. */
function freeze(draft: Draft): QuireKitTreeNode {
  return draft.children.length ? { id: draft.id, label: draft.label, children: draft.children.map(freeze) } : { id: draft.id, label: draft.label };
}

/**
 * Nests flat headings by level; a skipped level attaches to the nearest shallower heading.
 * @param entries - Headings in document order.
 * @returns TreeView nodes and the ids of every branch.
 */
export function buildMdOutlineTree(entries: readonly MdOutlineEntry[]): MdOutlineTree {
  const roots: Draft[] = [], stack: Draft[] = [], branches: string[] = [];
  for (const entry of entries) {
    const draft: Draft = { id: entry.id, label: entry.text, level: entry.level, children: [] };
    while (stack.length && stack.at(-1)!.level >= entry.level) stack.pop();
    const parent = stack.at(-1);
    if (parent) { if (!parent.children.length) branches.push(parent.id); parent.children.push(draft); } else roots.push(draft);
    stack.push(draft);
  }
  return { nodes: roots.map(freeze), branches };
}
