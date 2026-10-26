import type { Decoration } from "@quirekit/pm";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireLayoutNode } from "../../layout";
import type { QuireLayoutSnapshot } from "../../editor-layout";
import {
  findQuireTextCaretStopAtPosition,
  type QuireTextFragment
} from "@quirekit/layout/text";

/** Text fragments of one layout tree sorted by start position, with layout order kept. */
interface QuireTextFragmentIndex {
  /** Fragments sorted by `range.from`. */
  readonly byFrom: readonly { readonly fragment: QuireTextFragment; readonly order: number }[];
  /** Longest fragment range, bounding how far before a position an overlap can start. */
  readonly maxLength: number;
}

const fragmentIndexes = new WeakMap<QuireLayoutNode, QuireTextFragmentIndex>();

/**
 * Collects text fragments intersected by a decoration, binary-searching a per-layout index.
 *
 * @param snapshot - Layout snapshot to inspect.
 * @param decoration - Decoration whose range should be matched.
 * @returns Intersecting text fragments in layout order.
 */
export function collectDecorationTextFragments(
  snapshot: QuireLayoutSnapshot,
  decoration: Decoration
): readonly QuireTextFragment[] {
  const { byFrom, maxLength } = readTextFragmentIndex(snapshot.root);
  let low = 0;
  let high = byFrom.length;
  while (low < high) {
    const middle = (low + high) >> 1;
    if (byFrom[middle]!.fragment.range.from < decoration.from - maxLength) low = middle + 1;
    else high = middle;
  }
  const hits: (typeof byFrom)[number][] = [];
  for (let at = low; at < byFrom.length && byFrom[at]!.fragment.range.from < decoration.to; at += 1) {
    if (byFrom[at]!.fragment.range.to > decoration.from) hits.push(byFrom[at]!);
  }
  return hits.sort((left, right) => left.order - right.order).map((hit) => hit.fragment);
}

/**
 * Resolves an inline decoration rectangle inside one text fragment.
 *
 * @param fragment - Text fragment intersected by a decoration.
 * @param range - Concrete intersection range.
 * @returns Paint rectangle or null when the intersection is empty.
 */
export function resolveInlineDecorationRect(
  fragment: QuireTextFragment,
  range: QuireDocumentRange
): QuireRect | null {
  if (range.from >= range.to) {
    return null;
  }

  const start = findQuireTextCaretStopAtPosition(fragment, range.from);
  const end = findQuireTextCaretStopAtPosition(fragment, range.to);
  const left = fragment.rect.x + Math.min(start.localX, end.localX);
  const right = fragment.rect.x + Math.max(start.localX, end.localX);

  return {
    x: left,
    y: fragment.rect.y,
    width: Math.max(1, right - left),
    height: fragment.lineHeight
  };
}

/**
 * Builds or reuses the fragment index of one layout tree.
 *
 * @param root - Immutable layout root.
 * @returns Fragments sorted by start position with their layout order.
 */
function readTextFragmentIndex(root: QuireLayoutNode): QuireTextFragmentIndex {
  const cached = fragmentIndexes.get(root);
  if (cached !== undefined) return cached;
  const byFrom: { fragment: QuireTextFragment; order: number }[] = [];
  let maxLength = 0;
  const visit = (node: QuireLayoutNode): void => {
    for (const fragment of node.textFragments ?? []) {
      byFrom.push({ fragment, order: byFrom.length });
      maxLength = Math.max(maxLength, fragment.range.to - fragment.range.from);
    }
    for (const child of node.children ?? []) visit(child);
  };
  visit(root);
  byFrom.sort((left, right) => left.fragment.range.from - right.fragment.range.from || left.order - right.order);
  const index = { byFrom, maxLength };
  fragmentIndexes.set(root, index);
  return index;
}
