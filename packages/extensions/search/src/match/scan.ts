import type { EditorState, Node as PMNode } from "@quirekit/pm";
import { indexTextblock } from "../index/textblock";
import type {
  SearchHost,
  SearchMatch,
  SearchQuery,
  SearchRange,
  SearchScopeSegment
} from "../types";
import { findTextblockMatches } from "./literal";

/** Document interval covered by one complete textblock node. */
export interface TextblockRange {
  /** Position immediately before the textblock. */
  readonly from: number;
  /** Position immediately after the textblock. */
  readonly to: number;
}

/**
 * Resolves the ordered search scope, defaulting to the whole document.
 *
 * @param host - Host hooks.
 * @param state - Editor state being scanned.
 * @returns Ordered scope segments.
 */
export function resolveSearchScope(
  host: SearchHost,
  state: EditorState
): readonly SearchScopeSegment[] {
  return host.resolveScope?.(state)
    ?? [{ from: 0, to: state.doc.content.size, kind: "document" }];
}

/**
 * Intersects scope segments with an optional limiting range.
 *
 * @param segments - Ordered scope segments.
 * @param limit - Limiting range, or null for none.
 * @returns Clipped non-empty segments in the same order.
 */
export function limitSearchScope(
  segments: readonly SearchScopeSegment[],
  limit: SearchRange | null
): readonly SearchScopeSegment[] {
  if (limit === null) return segments;
  return segments
    .map((segment) => ({ ...segment, from: Math.max(segment.from, limit.from), to: Math.min(segment.to, limit.to) }))
    .filter((segment) => segment.to > segment.from);
}

/**
 * Scans every textblock inside the scope.
 *
 * @param doc - Document to scan.
 * @param segments - Ordered scope segments.
 * @param query - Committed query.
 * @returns Matches sorted in navigation order.
 */
export function scanSearchScope(
  doc: PMNode,
  segments: readonly SearchScopeSegment[],
  query: SearchQuery
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  for (const segment of segments) {
    forEachTextblock(doc, segment.from, segment.to, (node, position) => {
      matches.push(...findTextblockMatches(indexTextblock(node, position), query, segment));
    });
  }
  return matches;
}

/**
 * Rescans selected textblocks against every segment that overlaps them.
 *
 * @param doc - Document to scan.
 * @param blocks - Complete textblock ranges to rescan.
 * @param segments - Ordered scope segments.
 * @param query - Committed query.
 * @returns Matches found inside the given textblocks, unsorted.
 */
export function scanTextblocks(
  doc: PMNode,
  blocks: readonly TextblockRange[],
  segments: readonly SearchScopeSegment[],
  query: SearchQuery
): SearchMatch[] {
  const matches: SearchMatch[] = [];
  for (const block of blocks) {
    const node = doc.nodeAt(block.from);
    if (node === null || !node.isTextblock) continue;
    const indexed = indexTextblock(node, block.from);
    for (const segment of segments) {
      if (segment.to <= block.from || segment.from >= block.to) continue;
      matches.push(...findTextblockMatches(indexed, query, segment));
    }
  }
  return matches;
}

/**
 * Sorts matches by scope segment order, then by document position.
 *
 * @param matches - Mutable match array.
 * @param segments - Ordered scope segments.
 * @returns The same array, sorted.
 */
export function sortSearchMatches(
  matches: SearchMatch[],
  segments: readonly SearchScopeSegment[]
): SearchMatch[] {
  if (segments.length <= 1) return matches.sort((left, right) => left.from - right.from);
  const ranks = new Map<SearchMatch, number>();
  for (const match of matches) {
    const index = segments.findIndex((segment) =>
      match.from >= segment.from && match.to <= segment.to);
    ranks.set(match, index === -1 ? segments.length : index);
  }
  return matches.sort((left, right) =>
    ranks.get(left)! - ranks.get(right)! || left.from - right.from);
}

/**
 * Visits textblocks overlapping a document interval without descending into them.
 *
 * @param doc - Document to traverse.
 * @param from - Interval start.
 * @param to - Interval end.
 * @param visit - Callback receiving each textblock and its position.
 */
export function forEachTextblock(
  doc: PMNode,
  from: number,
  to: number,
  visit: (node: PMNode, position: number) => void
): void {
  doc.nodesBetween(from, to, (node, position) => {
    if (!node.isTextblock) return true;
    visit(node, position);
    return false;
  });
}
