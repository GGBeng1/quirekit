import { Tree, type TreeBuffer } from "@lezer/common";
import type { SyntaxChangeWork, SyntaxChunkPath } from "./types";

/**
 * Keeps only the current ancestor path, avoiding a root lookup for every retained block.
 * @param root - Previous native parse, in old source coordinates.
 * @param work - Actual old-tree path checks, including discarded ancestors.
 * @returns Exact identity/position matcher for ordered new-tree chunks.
 */
export function createChunkMatcher(root: Tree, work: SyntaxChangeWork): (from: number, chunk: Tree | TreeBuffer) => boolean {
  const path: SyntaxChunkPath[] = [{ tree: root, from: 0 }];
  /** @param parent - Old ancestor. @param from - Candidate old origin. @param chunk - Candidate native identity. @param retain - Whether positive, non-overlapping ancestry can be retained. @returns Exact reuse proof. */
  function search(parent: SyntaxChunkPath, from: number, chunk: Tree | TreeBuffer, retain: boolean): boolean {
    const { tree, from: base } = parent, relative = from - base;
    if (relative === 0 && tree === chunk) return true;
    let low = 0, high = tree.positions.length;
    while (low < high) { const middle = (low + high) >>> 1; if (tree.positions[middle]! <= relative) low = middle + 1; else high = middle; }
    for (let index = low - 1; index >= 0; index--) {
      const child = tree.children[index]!, start = tree.positions[index]!;
      if (start + child.length < relative + chunk.length) break;
      if (start === relative && child === chunk) return true;
      if (!(child instanceof Tree)) continue;
      const nested = { tree: child, from: base + start };
      if (retain) path.push(nested);
      work.comparedChunks++;
      if (search(nested, from, chunk, retain)) return true;
      // Native positive siblings do not overlap. Zero-length boundary candidates
      // use a fresh search so equal-position siblings cannot be hidden by a path.
      if (retain) return false;
    }
    return false;
  }
  return (from, chunk) => {
    if (chunk.length === 0) { work.comparedChunks++; return search({ tree: root, from: 0 }, from, chunk, false); }
    while (path.length > 1) {
      const parent = path.at(-1)!; work.comparedChunks++;
      const end = parent.from + parent.tree.length, to = from + chunk.length;
      // Equal envelopes may belong to several ancestors. A cached descendant
      // cannot rule out the requested identity at an enclosing equal span.
      if (parent.from <= from && end >= to && (parent.tree === chunk || parent.from < from || end > to)) return search(parent, from, chunk, true);
      path.pop();
    }
    work.comparedChunks++;
    return search(path[0]!, from, chunk, true);
  };
}
