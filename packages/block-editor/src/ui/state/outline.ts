import { getChangedRanges } from "@quirekit/core";
import type { Node, Transaction } from "@quirekit/pm";
import type { BlockOutlineEntry } from "./types";

/** @param node - Heading node. @param pos - Current PM position. @returns Outline projection. */
function entry(node: Node, pos: number): BlockOutlineEntry {
  return { node, pos, title: node.textContent || "未命名标题", level: Number(node.attrs.level) };
}

/** @param doc - Captured document on first visible consumption. @returns Semantic headings. */
export function readBlockOutline(doc: Node): readonly BlockOutlineEntry[] {
  const result: BlockOutlineEntry[] = [];
  doc.descendants((node, pos) => {
    if (node.type.name === "heading") { result.push(entry(node, pos)); return false; }
    return true;
  });
  return result;
}

/**
 * Maps existing headings and inspects only changed document ranges.
 * @param previous - Headings from the preceding document.
 * @param transaction - Accepted transformation, including mapping and final doc.
 * @returns Updated outline, retaining the original array for selection-only work.
 */
export function updateBlockOutline(previous: readonly BlockOutlineEntry[], transaction: Transaction): readonly BlockOutlineEntry[] {
  if (!transaction.docChanged) return previous;
  const entries = new Map<number, BlockOutlineEntry>();
  for (const item of previous) {
    const mapped = transaction.mapping.mapResult(item.pos, 1);
    if (mapped.deleted) continue;
    const node = transaction.doc.nodeAt(mapped.pos);
    if (node?.type.name === "heading") {
      entries.set(mapped.pos, node === item.node ? { ...item, pos: mapped.pos } : entry(node, mapped.pos));
    }
  }
  for (const { newRange } of getChangedRanges(transaction)) {
    transaction.doc.nodesBetween(newRange.from, newRange.to, (node, pos) => {
      if (node.type.name === "heading") { entries.set(pos, entry(node, pos)); return false; }
      return true;
    });
  }
  return [...entries.values()].sort((a, b) => a.pos - b.pos);
}
