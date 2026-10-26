import {
  containsQuirePoint,
  doQuireRectsIntersect
} from "@quirekit/renderer";
import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import type {
  QuireLayoutInteractionQueryEntry,
  QuireLayoutInteractionQueryIndex
} from "../types";

/**
 * Queries a retained layout interaction index at one point.
 *
 * @param index - Retained layout interaction query index.
 * @param point - Document-space point used to select coarse buckets.
 * @returns Candidate entries in deterministic preorder.
 */
export function queryQuireLayoutInteractionQueryIndexAtPoint(
  index: QuireLayoutInteractionQueryIndex,
  point: QuirePoint
): readonly QuireLayoutInteractionQueryEntry[] {
  const entryIndexes: number[] = [];
  const seen = new Set<number>();

  for (const bucket of index.buckets) {
    if (!containsQuirePoint(bucket.rect, point)) {
      continue;
    }

    appendUniqueQuireLayoutInteractionEntryIndexes(
      entryIndexes,
      seen,
      bucket.entryIndexes
    );
  }

  if (entryIndexes.length === 0) {
    appendUniqueQuireLayoutInteractionEntryIndexes(
      entryIndexes,
      seen,
      index.unbucketedEntryIndexes
    );
  }

  return mapQuireLayoutInteractionEntryIndexes(index, entryIndexes);
}

/**
 * Queries a retained layout interaction index for entries intersecting a rect.
 *
 * @param index - Retained layout interaction query index.
 * @param rect - Document-space rectangle used to select coarse buckets.
 * @returns Candidate entries in deterministic preorder.
 */
export function queryQuireLayoutInteractionQueryIndexInRect(
  index: QuireLayoutInteractionQueryIndex,
  rect: QuireRect
): readonly QuireLayoutInteractionQueryEntry[] {
  const entryIndexes: number[] = [];
  const seen = new Set<number>();

  for (const bucket of index.buckets) {
    if (!doQuireRectsIntersect(bucket.rect, rect)) {
      continue;
    }

    appendUniqueQuireLayoutInteractionEntryIndexes(
      entryIndexes,
      seen,
      bucket.entryIndexes
    );
  }

  if (entryIndexes.length === 0) {
    appendUniqueQuireLayoutInteractionEntryIndexes(
      entryIndexes,
      seen,
      index.unbucketedEntryIndexes
    );
  }

  return mapQuireLayoutInteractionEntryIndexes(index, entryIndexes)
    .filter((entry) => doQuireRectsIntersect(entry.rect, rect));
}

/**
 * Appends entry indexes while preserving first-seen order.
 *
 * @param target - Mutable entry-index accumulator.
 * @param seen - Mutable set of indexes already appended.
 * @param source - Source indexes to append.
 * @returns Nothing.
 */
function appendUniqueQuireLayoutInteractionEntryIndexes(
  target: number[],
  seen: Set<number>,
  source: readonly number[]
): void {
  for (const entryIndex of source) {
    if (seen.has(entryIndex)) {
      continue;
    }

    seen.add(entryIndex);
    target.push(entryIndex);
  }
}

/**
 * Maps entry indexes to defined interaction query entries.
 *
 * @param index - Retained layout interaction query index.
 * @param entryIndexes - Indexes selected by a coarse query.
 * @returns Defined entries in index order.
 */
function mapQuireLayoutInteractionEntryIndexes(
  index: QuireLayoutInteractionQueryIndex,
  entryIndexes: readonly number[]
): readonly QuireLayoutInteractionQueryEntry[] {
  const entries: QuireLayoutInteractionQueryEntry[] = [];

  for (const entryIndex of entryIndexes) {
    const entry = index.entries[entryIndex];

    if (entry !== undefined) {
      entries.push(entry);
    }
  }

  return entries;
}
