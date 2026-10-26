import { doQuireRectsIntersect } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type {
  QuireLayoutInteractionQueryEntry,
  QuireLayoutInteractionQueryIndex,
  QuireLayoutInteractionQueryIndexBucket,
  QuireLayoutNode,
  QuireLayoutPage
} from "../types";

/** Options used to create a retained layout interaction query index. */
export interface CreateQuireLayoutInteractionQueryIndexOptions {
  /** Snapshot root whose children should be indexed for interaction queries. */
  readonly root: QuireLayoutNode;
  /** Optional page metadata used as coarse query buckets. */
  readonly pages?: readonly QuireLayoutPage[] | undefined;
  /** Optional viewport rectangle used as the unpaginated coarse query bucket. */
  readonly viewportRect?: QuireRect | undefined;
}

/**
 * Creates a retained layout-node interaction query index.
 *
 * @param options - Snapshot root, page buckets, and optional viewport bucket.
 * @returns Retained interaction query index, or undefined when no nodes exist.
 */
export function createQuireLayoutInteractionQueryIndex(
  options: CreateQuireLayoutInteractionQueryIndexOptions
): QuireLayoutInteractionQueryIndex | undefined {
  const entries = collectQuireLayoutInteractionQueryEntries(options.root);

  if (entries.length === 0) {
    return undefined;
  }

  const buckets = createQuireLayoutInteractionQueryBuckets(
    entries,
    options.pages ?? [],
    options.viewportRect
  );
  const bucketedEntryIndexes = new Set(
    buckets.flatMap((bucket) => bucket.entryIndexes)
  );
  const unbucketedEntryIndexes = entries
    .map((_entry, index) => index)
    .filter((entryIndex) => !bucketedEntryIndexes.has(entryIndex));

  return {
    entries,
    buckets,
    unbucketedEntryIndexes,
    entryCount: entries.length
  };
}

/**
 * Collects clone-safe interaction entries from the snapshot root children.
 *
 * @param root - Snapshot root whose children should be indexed.
 * @returns Indexed layout-node entries in preorder.
 */
function collectQuireLayoutInteractionQueryEntries(
  root: QuireLayoutNode
): readonly QuireLayoutInteractionQueryEntry[] {
  const entries: QuireLayoutInteractionQueryEntry[] = [];

  appendQuireLayoutInteractionQueryEntries(
    root.children ?? [],
    [],
    0,
    entries
  );

  return entries;
}

/**
 * Appends indexed entries for a layout subtree.
 *
 * @param nodes - Layout nodes to index.
 * @param parentPath - Path to the parent node from the snapshot root.
 * @param depth - Depth of the current children below the snapshot root children.
 * @param entries - Mutable entry accumulator.
 * @returns Nothing.
 */
function appendQuireLayoutInteractionQueryEntries(
  nodes: readonly QuireLayoutNode[],
  parentPath: readonly number[],
  depth: number,
  entries: QuireLayoutInteractionQueryEntry[]
): void {
  for (const [childIndex, node] of nodes.entries()) {
    const order = entries.length;
    const path = [...parentPath, childIndex];

    entries.push({
      entryId: `layout-node:${order}:${node.id}`,
      nodeId: node.id,
      range: node.range,
      rect: node.rect,
      order,
      depth,
      path
    });

    appendQuireLayoutInteractionQueryEntries(
      node.children ?? [],
      path,
      depth + 1,
      entries
    );
  }
}

/**
 * Creates page or viewport buckets for retained layout-node entries.
 *
 * @param entries - Indexed layout-node entries.
 * @param pages - Optional page buckets.
 * @param viewportRect - Optional viewport bucket for unpaginated snapshots.
 * @returns Coarse query buckets in page-then-viewport order.
 */
function createQuireLayoutInteractionQueryBuckets(
  entries: readonly QuireLayoutInteractionQueryEntry[],
  pages: readonly QuireLayoutPage[],
  viewportRect: QuireRect | undefined
): readonly QuireLayoutInteractionQueryIndexBucket[] {
  if (pages.length > 0) {
    return pages.map((page) => ({
      bucketId: `page:${page.pageIndex}`,
      pageIndex: page.pageIndex,
      rect: page.pageRect,
      entryIndexes: createQuireLayoutInteractionQueryBucketEntryIndexes(
        entries,
        page.pageRect
      )
    }));
  }

  return viewportRect === undefined
    ? []
    : [
        {
          bucketId: "viewport:snapshot",
          rect: viewportRect,
          entryIndexes: createQuireLayoutInteractionQueryBucketEntryIndexes(
            entries,
            viewportRect
          )
        }
      ];
}

/**
 * Finds indexed entries that intersect one coarse bucket rectangle.
 *
 * @param entries - Indexed layout-node entries.
 * @param rect - Bucket rectangle.
 * @returns Entry indexes covered by the bucket.
 */
function createQuireLayoutInteractionQueryBucketEntryIndexes(
  entries: readonly QuireLayoutInteractionQueryEntry[],
  rect: QuireRect
): readonly number[] {
  return entries
    .map((entry, index) => ({ entry, index }))
    .filter(({ entry }) => doQuireRectsIntersect(entry.rect, rect))
    .map(({ index }) => index);
}
