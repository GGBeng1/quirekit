import type { Transaction } from "@quirekit/pm";
import type { SearchMatch, SearchQuery, SearchScopeSegment } from "../types";
import {
  forEachTextblock,
  scanTextblocks,
  sortSearchMatches,
  type TextblockRange
} from "./scan";

/** Result of updating matches after one document-changing transaction. */
export interface IncrementalSearchUpdate {
  /** Complete match list in navigation order. */
  readonly matches: SearchMatch[];
  /** Textblocks whose matches were rescanned, in the new document. */
  readonly rescanned: readonly TextblockRange[];
  /** Matches found inside `rescanned`. */
  readonly added: readonly SearchMatch[];
}

/** Changed interval of one transaction in both documents. */
export interface DocumentDiff {
  /** First changed position, identical in both documents. */
  readonly start: number;
  /** End of the changed interval in the old document. */
  readonly oldEnd: number;
  /** End of the changed interval in the new document. */
  readonly newEnd: number;
}

/**
 * Finds the single interval that differs between the old and new documents.
 *
 * Structural sharing makes this proportional to the changed path rather than
 * the document or step count, so a replace-all with thousands of steps costs
 * the same as one keystroke to locate.
 *
 * @param tr - Document-changing transaction.
 * @returns Changed interval, or null when the documents are identical.
 */
export function diffDocuments(tr: Transaction): DocumentDiff | null {
  const before = tr.before.content;
  const after = tr.doc.content;
  const start = before.findDiffStart(after);
  if (start === null) return null;
  let { a, b } = before.findDiffEnd(after) ?? { a: before.size, b: after.size };
  // Repeated content around an edit lets the backward scan pass the start; shift both ends together.
  const overlap = start - Math.min(a, b);
  if (overlap > 0) {
    a += overlap;
    b += overlap;
  }
  return { start, oldEnd: a, newEnd: b };
}

/**
 * Collects complete textblocks overlapping the changed interval of the new document.
 *
 * The interval is widened by one position so edits at block boundaries reach
 * both neighbours.
 *
 * @param tr - Document-changing transaction.
 * @param diff - Changed interval.
 * @returns Textblock ranges in the new document.
 */
function collectChangedTextblocks(tr: Transaction, diff: DocumentDiff): TextblockRange[] {
  const blocks: TextblockRange[] = [];
  const from = Math.max(0, diff.start - 1);
  const to = Math.min(tr.doc.content.size, diff.newEnd + 1);
  forEachTextblock(tr.doc, from, to, (node, position) => {
    blocks.push({ from: position, to: position + node.nodeSize });
  });
  return blocks;
}

/**
 * Keeps matches outside the changed interval and rescans only the textblocks inside it.
 *
 * Matches before the interval keep their positions; matches after it shift by the
 * size change. Invariant: the result equals a full rescan of the new document,
 * because text outside the rescanned textblocks is unchanged.
 *
 * @param matches - Matches in the old document.
 * @param tr - Document-changing transaction.
 * @param segments - Scope segments for the new document.
 * @param query - Committed query.
 * @returns Updated matches and the rescanned blocks.
 */
export function updateSearchMatches(
  matches: readonly SearchMatch[],
  tr: Transaction,
  segments: readonly SearchScopeSegment[],
  query: SearchQuery
): IncrementalSearchUpdate {
  const diff = diffDocuments(tr);
  if (diff === null) return { matches: [...matches], rescanned: [], added: [] };
  const rescanned = collectChangedTextblocks(tr, diff);
  const shift = diff.newEnd - diff.oldEnd;
  const firstBlock = rescanned[0]?.from ?? diff.start;
  const lastBlock = rescanned[rescanned.length - 1]?.to ?? diff.newEnd;
  const before: SearchMatch[] = [];
  const after: SearchMatch[] = [];
  for (const match of matches) {
    if (match.to <= diff.start) {
      if (match.to <= firstBlock) before.push(match);
    } else if (match.from >= diff.oldEnd) {
      const shifted = { ...match, from: match.from + shift, to: match.to + shift };
      if (shifted.from >= lastBlock) after.push(shifted);
    }
  }
  const added = scanTextblocks(tr.doc, rescanned, segments, query);
  // With one segment, navigation order is document order and the three runs are already ordered.
  const ordered = segments.length <= 1
    ? [...before, ...added.sort((left, right) => left.from - right.from), ...after]
    : sortSearchMatches([...before, ...added, ...after], segments);
  return { matches: ordered, rescanned, added };
}
