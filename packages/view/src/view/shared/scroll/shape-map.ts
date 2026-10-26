import type { Fragment, Node as PMNode } from "@quirekit/pm";

/**
 * Follows a position into a document of possibly different shape.
 *
 * Positions depend only on shape: node types, nesting and text. Attributes and
 * marks are ignored, so a node rebuilt with new attributes (such as a fresh
 * block id on every preview) keeps its positions. The child holding the position
 * is located level by level: in the common prefix or suffix it maps directly;
 * between several changes it is found as the equally shaped child of the same
 * rank among its equals, so edits above and below it in one step do not lose it.
 *
 * @param before - Fragment the position belongs to.
 * @param after - Fragment to map into.
 * @param pos - Position relative to the start of `before`.
 * @returns Position relative to the start of `after`, or null when its own content changed.
 */
export function mapPositionByShape(before: Fragment, after: Fragment, pos: number): number | null {
  if (before === after) return pos;
  const located = locateChild(before, pos);
  if (located === null) return null;
  const { index, offset } = located;
  const prefix = commonPrefix(before, after);
  if (index < prefix) return pos;
  const suffix = commonSuffix(before, after, prefix);
  if (index >= before.childCount - suffix) return pos - before.size + after.size;
  const child = before.child(index);
  const match = findEqualRank(before, after, index, prefix, suffix);
  if (match !== null) return childOffset(after, match) + pos - offset;
  // The child itself changed; follow it inside when the counterpart is unambiguous.
  const middleBefore = before.childCount - suffix - prefix;
  const middleAfter = after.childCount - suffix - prefix;
  if (middleBefore !== middleAfter || child.isText || pos === offset) return null;
  const counterpart = after.child(index);
  if (counterpart.type !== child.type) return null;
  const inner = mapPositionByShape(child.content, counterpart.content, pos - offset - 1);
  return inner === null ? null : childOffset(after, index) + 1 + inner;
}

/**
 * @param left - First node.
 * @param right - Second node.
 * @returns Whether both nodes have the same shape.
 */
function sameShape(left: PMNode, right: PMNode): boolean {
  if (left === right) return true;
  if (left.type !== right.type || left.nodeSize !== right.nodeSize) return false;
  if (left.isText) return left.text === right.text;
  if (left.childCount !== right.childCount) return false;
  for (let index = 0; index < left.childCount; index++) {
    if (!sameShape(left.child(index), right.child(index))) return false;
  }
  return true;
}

/**
 * @param fragment - Fragment to search.
 * @param pos - Position relative to the fragment start.
 * @returns Index and start offset of the child holding the position, or null past the end.
 */
function locateChild(fragment: Fragment, pos: number): { index: number; offset: number } | null {
  let offset = 0;
  for (let index = 0; index < fragment.childCount; index++) {
    const size = fragment.child(index).nodeSize;
    if (pos < offset + size) return { index, offset };
    offset += size;
  }
  return null;
}

/**
 * @param fragment - Fragment.
 * @param index - Child index.
 * @returns Start offset of that child.
 */
function childOffset(fragment: Fragment, index: number): number {
  let offset = 0;
  for (let current = 0; current < index; current++) offset += fragment.child(current).nodeSize;
  return offset;
}

/**
 * @param before - First fragment.
 * @param after - Second fragment.
 * @returns Number of leading children with the same shape.
 */
function commonPrefix(before: Fragment, after: Fragment): number {
  const limit = Math.min(before.childCount, after.childCount);
  let count = 0;
  while (count < limit && sameShape(before.child(count), after.child(count))) count++;
  return count;
}

/**
 * @param before - First fragment.
 * @param after - Second fragment.
 * @param prefix - Leading children already matched, which the suffix may not overlap.
 * @returns Number of trailing children with the same shape.
 */
function commonSuffix(before: Fragment, after: Fragment, prefix: number): number {
  const limit = Math.min(before.childCount, after.childCount) - prefix;
  let count = 0;
  while (count < limit
    && sameShape(before.child(before.childCount - 1 - count), after.child(after.childCount - 1 - count))) count++;
  return count;
}

/**
 * Finds the child of `after` matching a changed-span child of `before`.
 *
 * @param before - Fragment holding the child.
 * @param after - Fragment to search.
 * @param index - Child index in `before`.
 * @param prefix - Common prefix length.
 * @param suffix - Common suffix length.
 * @returns Index in `after` of the equally shaped child with the same rank among its equals, or null.
 */
function findEqualRank(before: Fragment, after: Fragment, index: number, prefix: number, suffix: number): number | null {
  const child = before.child(index);
  let rank = 0;
  for (let current = prefix; current < index; current++) if (sameShape(before.child(current), child)) rank++;
  for (let current = prefix; current < after.childCount - suffix; current++) {
    if (sameShape(after.child(current), child) && rank-- === 0) return current;
  }
  return null;
}
