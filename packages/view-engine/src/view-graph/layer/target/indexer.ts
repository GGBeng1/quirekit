import {
  containsQuirePoint,
  doQuireRectsIntersect,
  type QuirePoint
} from "@quirekit/renderer";
import type {
  CreateQuireViewLayerTargetIndexOptions,
  QuireViewLayerTargetIndex,
  QuireViewLayerTargetIndexBucket,
  QuireViewLayerTargetIndexPage,
  QuireViewLayerTargetIndexQueryDiagnostics,
  QuireViewLayerTargetIndexTarget,
  QuireViewLayerTargetIndexViewport
} from "../../types";

/**
 * Creates a coarse retained layer target index.
 *
 * @param options - Retained targets and optional page buckets.
 * @returns Layer target index keyed by page/viewport buckets plus unbucketed targets.
 */
export function createQuireViewLayerTargetIndex(
  options: CreateQuireViewLayerTargetIndexOptions
): QuireViewLayerTargetIndex {
  const buckets = createQuireViewLayerTargetIndexBuckets(options);
  const bucketedTargetIds = new Set(
    buckets.flatMap((bucket) => bucket.targetIds)
  );
  const unbucketedTargetIds = options.targets
    .filter((target) => !bucketedTargetIds.has(target.targetId))
    .map((target) => target.targetId);

  return {
    buckets,
    unbucketedTargetIds,
    targetCount: options.targets.length
  };
}

/**
 * Queries a retained layer target index and reports the buckets that supplied candidates.
 *
 * @param index - Retained layer target index to query.
 * @param point - Document-space point used for coarse bucket selection.
 * @returns Candidate target ids plus bucket diagnostics for hit-test traces.
 */
export function queryQuireViewLayerTargetIndexAtPointWithDiagnostics(
  index: QuireViewLayerTargetIndex,
  point: QuirePoint
): QuireViewLayerTargetIndexQueryDiagnostics {
  const targetIds: string[] = [];
  const seen = new Set<string>();
  const buckets: QuireViewLayerTargetIndexQueryDiagnostics["buckets"][number][] = [];

  for (const bucket of index.buckets) {
    if (!containsQuirePoint(bucket.rect, point)) {
      continue;
    }

    buckets.push({
      bucketId: bucket.bucketId,
      ...(bucket.pageIndex === undefined ? {} : { pageIndex: bucket.pageIndex }),
      targetIds: bucket.targetIds
    });
    appendUniqueTargetIds(targetIds, seen, bucket.targetIds);
  }

  appendUniqueTargetIds(targetIds, seen, index.unbucketedTargetIds);

  return {
    targetIds,
    buckets,
    unbucketedTargetIds: index.unbucketedTargetIds,
    source: "retained-layer-target-index"
  };
}

/**
 * Creates page and viewport buckets for targets that intersect supplied windows.
 *
 * @param options - Retained targets and optional coarse windows.
 * @returns Index buckets in deterministic page-then-viewport order.
 */
function createQuireViewLayerTargetIndexBuckets(
  options: CreateQuireViewLayerTargetIndexOptions
): readonly QuireViewLayerTargetIndexBucket[] {
  return [
    ...createQuireViewLayerTargetIndexPageBuckets(
      options.targets,
      options.pages ?? []
    ),
    ...createQuireViewLayerTargetIndexViewportBuckets(
      options.targets,
      options.viewports ?? []
    )
  ];
}

/**
 * Creates page buckets for retained layer target indexing.
 *
 * @param targets - Retained targets to bucket.
 * @param pages - Page windows used as coarse buckets.
 * @returns Page buckets in page order.
 */
function createQuireViewLayerTargetIndexPageBuckets(
  targets: readonly QuireViewLayerTargetIndexTarget[],
  pages: readonly QuireViewLayerTargetIndexPage[]
): readonly QuireViewLayerTargetIndexBucket[] {
  return pages.map((page) => ({
    bucketId: `page:${page.pageIndex}`,
    pageIndex: page.pageIndex,
    rect: page.rect,
    targetIds: createQuireViewLayerTargetIndexBucketTargetIds(
      targets,
      page.rect
    )
  }));
}

/**
 * Creates viewport buckets for retained layer target indexing.
 *
 * @param targets - Retained targets to bucket.
 * @param viewports - Viewport windows used as coarse buckets.
 * @returns Viewport buckets in input order.
 */
function createQuireViewLayerTargetIndexViewportBuckets(
  targets: readonly QuireViewLayerTargetIndexTarget[],
  viewports: readonly QuireViewLayerTargetIndexViewport[]
): readonly QuireViewLayerTargetIndexBucket[] {
  return viewports.map((viewport) => ({
    bucketId: `viewport:${viewport.viewportId}`,
    rect: viewport.rect,
    targetIds: createQuireViewLayerTargetIndexBucketTargetIds(
      targets,
      viewport.rect
    )
  }));
}

/**
 * Finds targets that intersect one coarse bucket rectangle.
 *
 * @param targets - Retained targets to filter.
 * @param rect - Bucket rectangle.
 * @returns Target ids covered by the bucket.
 */
function createQuireViewLayerTargetIndexBucketTargetIds(
  targets: readonly QuireViewLayerTargetIndexTarget[],
  rect: QuireViewLayerTargetIndexPage["rect"]
): string[] {
  return targets
    .filter((target) => doQuireRectsIntersect(target.rect, rect))
    .map((target) => target.targetId);
}

/**
 * Appends target ids while preserving first-seen order.
 *
 * @param target - Mutable target id accumulator.
 * @param seen - Mutable set of ids already appended.
 * @param source - Source ids to append.
 * @returns Nothing.
 */
function appendUniqueTargetIds(
  target: string[],
  seen: Set<string>,
  source: readonly string[]
): void {
  for (const targetId of source) {
    if (seen.has(targetId)) {
      continue;
    }

    seen.add(targetId);
    target.push(targetId);
  }
}
