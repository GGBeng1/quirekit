import type { Node as PMNode } from "@quirekit/pm";
import type { WordTableChildAlignment } from "./types";

/**
 * Aligns previous and next container children by instance lineage.
 *
 * Pure table transforms keep untouched nodes as the same instances and keep a
 * changed cell's content fragment, so lineage identifies which previous child a
 * next child continues. Structural equality cannot: empty cells are all equal,
 * and pairing a new empty cell with an old one would move remote edits into it.
 * Matching is order-preserving; a next child without an unconsumed lineage
 * match is an insertion, and skipped previous children are deletions.
 *
 * @param previous - Container before the transform.
 * @param next - Container after the transform.
 * @returns Source-ordered alignment covering every child of both containers.
 */
export function alignWordTableChildren(
  previous: PMNode,
  next: PMNode
): readonly WordTableChildAlignment[] {
  const lineage = indexPreviousLineage(previous);
  const alignment: WordTableChildAlignment[] = [];
  let gap: { previousFrom: number; previousTo: number; nextFrom: number; nextTo: number } | null = null;
  let previousIndex = 0;

  for (let nextIndex = 0; nextIndex < next.childCount; nextIndex += 1) {
    const child = next.child(nextIndex);
    const match = findLineageMatch(previous, lineage, child, previousIndex);
    if (match === null) {
      gap ??= { previousFrom: previousIndex, previousTo: previousIndex, nextFrom: nextIndex, nextTo: nextIndex };
      gap.nextTo = nextIndex + 1;
      continue;
    }
    if (match > previousIndex || gap !== null) {
      gap ??= { previousFrom: previousIndex, previousTo: previousIndex, nextFrom: nextIndex, nextTo: nextIndex };
      gap.previousTo = match;
      alignment.push({ kind: "gap", ...gap });
      gap = null;
    }
    alignment.push({
      kind: previous.child(match) === child ? "same" : "update",
      previousIndex: match,
      nextIndex
    });
    previousIndex = match + 1;
  }

  if (gap !== null || previousIndex < previous.childCount) {
    gap ??= { previousFrom: previousIndex, previousTo: previousIndex, nextFrom: next.childCount, nextTo: next.childCount };
    gap.previousTo = previous.childCount;
    alignment.push({ kind: "gap", ...gap });
  }
  return alignment;
}

/**
 * Indexes every lineage token of the previous children by child index.
 *
 * @param previous - Container before the transform.
 * @returns Ascending previous child indexes for each token.
 */
function indexPreviousLineage(previous: PMNode): Map<object, number[]> {
  const lineage = new Map<object, number[]>();
  previous.forEach((child, _offset, index) => {
    for (const token of collectLineageTokens(child)) {
      const indexes = lineage.get(token);
      if (indexes === undefined) lineage.set(token, [index]);
      else if (indexes[indexes.length - 1] !== index) indexes.push(index);
    }
  });
  return lineage;
}

/**
 * Finds the first unconsumed previous child sharing lineage with a next child.
 *
 * @param previous - Container before the transform.
 * @param lineage - Previous lineage index.
 * @param child - Next child to place.
 * @param from - First unconsumed previous child index.
 * @returns Matching previous child index, or null for an inserted child.
 */
function findLineageMatch(
  previous: PMNode,
  lineage: ReadonlyMap<object, readonly number[]>,
  child: PMNode,
  from: number
): number | null {
  let best: number | null = null;
  for (const token of collectLineageTokens(child)) {
    const candidate = lineage.get(token)?.find(index => index >= from);
    if (
      candidate !== undefined
      && (best === null || candidate < best)
      && previous.child(candidate).type === child.type
    ) {
      best = candidate;
    }
  }
  return best;
}

/**
 * Lists the instances that carry one node's lineage across a pure transform.
 *
 * Two levels suffice for table structure: a rebuilt row keeps its cells or
 * their content fragments, and a rebuilt cell keeps its blocks or content.
 * Empty fragments are shared singletons and never identify a node.
 *
 * @param node - Node whose lineage is collected.
 * @returns Node, child, and non-empty fragment instances.
 */
function collectLineageTokens(node: PMNode): readonly object[] {
  const tokens: object[] = [node];
  if (node.content.size > 0) tokens.push(node.content);
  node.forEach((child) => {
    tokens.push(child);
    if (child.content.size > 0) tokens.push(child.content);
  });
  return tokens;
}
