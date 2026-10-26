import type { QuirePoint, QuireRect } from "@quirekit/renderer";
import { createQuireLayoutInteractionQueryIndex, filterQuireLayoutInteractionQueryEntriesToShallowest, queryQuireLayoutInteractionQueryIndexAtPoint, queryQuireLayoutInteractionQueryIndexInRect, resolveQuireLayoutInteractionQueryEntryNodes, type QuireLayoutInteractionQueryEntry, type QuireLayoutInteractionQueryIndex, type QuireLayoutNode } from "../../../layout";
import type { QuireLayoutSnapshot } from "../../../editor-layout";

/** Options used to read layout query candidates at a point. */
interface QuireLayoutHitPointCandidateOptions {
  /** Snapshot whose retained layout query index should be consumed. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space point used to select query buckets. */
  readonly point: QuirePoint;
  /** Whether empty point buckets should fall back to all indexed entries. */
  readonly fallbackToAllEntries?: boolean | undefined;
}

/** Options used to read layout query candidates inside a rectangle. */
interface QuireLayoutHitRectCandidateOptions {
  /** Snapshot whose retained layout query index should be consumed. */
  readonly snapshot: QuireLayoutSnapshot;
  /** Document-space rectangle used to select query buckets. */
  readonly rect: QuireRect;
}

/**
 * Reads shallow layout-node candidates for a point from the retained query index.
 *
 * @param options - Snapshot, point, and fallback policy.
 * @returns Candidate layout nodes in stable document order.
 */
export function readQuireLayoutHitCandidateNodesAtPoint(
  options: QuireLayoutHitPointCandidateOptions
): readonly QuireLayoutNode[] {
  const index = readQuireLayoutInteractionQueryIndex(options.snapshot);

  if (index === undefined) {
    return options.snapshot.root.children ?? [];
  }

  const entries = queryQuireLayoutInteractionQueryIndexAtPoint(
    index,
    options.point
  );
  const candidateEntries = entries.length > 0
    ? entries
    : options.fallbackToAllEntries === true
      ? index.entries
      : [];

  return resolveShallowQuireLayoutQueryEntries(
    options.snapshot,
    candidateEntries
  );
}

/**
 * Reads shallow layout-node candidates intersecting a rectangle.
 *
 * @param options - Snapshot and document-space rectangle.
 * @returns Candidate layout nodes in stable document order.
 */
export function readQuireLayoutHitCandidateNodesInRect(
  options: QuireLayoutHitRectCandidateOptions
): readonly QuireLayoutNode[] {
  const index = readQuireLayoutInteractionQueryIndex(options.snapshot);

  if (index === undefined) {
    return options.snapshot.root.children ?? [];
  }

  return resolveShallowQuireLayoutQueryEntries(
    options.snapshot,
    queryQuireLayoutInteractionQueryIndexInRect(index, options.rect)
  );
}

/**
 * Reads or derives the layout interaction query index for a snapshot.
 *
 * Production snapshots receive this index from the layout snapshot producer.
 * Snapshots constructed outside that producer can derive the same index from
 * the canonical node tree without changing mounted runtime behavior.
 *
 * @param snapshot - Snapshot whose query index should be read.
 * @returns Retained interaction query index, or undefined when no nodes exist.
 */
function readQuireLayoutInteractionQueryIndex(
  snapshot: QuireLayoutSnapshot
): QuireLayoutInteractionQueryIndex | undefined {
  return snapshot.interactionQueryIndex ?? createQuireLayoutInteractionQueryIndex({
    root: snapshot.root,
    pages: snapshot.pages,
    viewportRect: snapshot.viewportRect
  });
}

/**
 * Resolves shallow query entries to layout nodes.
 *
 * @param snapshot - Snapshot that owns the indexed node tree.
 * @param entries - Candidate query entries.
 * @returns Resolved candidate nodes with descendant duplicates removed.
 */
function resolveShallowQuireLayoutQueryEntries(
  snapshot: QuireLayoutSnapshot,
  entries: readonly QuireLayoutInteractionQueryEntry[]
): readonly QuireLayoutNode[] {
  return resolveQuireLayoutInteractionQueryEntryNodes(
    snapshot.root,
    filterQuireLayoutInteractionQueryEntriesToShallowest(entries)
  );
}
