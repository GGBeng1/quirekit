import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox } from "../../types";
import { bucketQuireTextFragmentsByPage } from "./text-bucket";
import {
  findQuirePageBodyProjectionForProjectedChild,
} from "./page";
import type { QuirePageBodyProjection } from "./types";
import { resolveQuireProjectionOccurrence } from "./occurrence";

/** Inputs for collecting projected content into page-local buckets. */
interface QuirePageContentBucketOptions {
  /** Source text fragments owned directly by the box being split. */
  readonly fragments: readonly QuireTextFragment[];
  /** Already-projected child boxes owned by the box being split. */
  readonly children: readonly QuireLayoutBox[];
  /** Available page-body projections. */
  readonly projections: readonly QuirePageBodyProjection[];
}

/** Page-local content collected for one page of a straddling box. */
export interface QuirePageContentBucket {
  /** Zero-based page index the content belongs to. */
  readonly pageIndex: number;
  /** Projection that moves this bucket into its page body. */
  readonly projection: QuirePageBodyProjection;
  /** Document range covered by the bucket content. */
  readonly range: QuireDocumentRange;
  /** Page-local rectangle covered by the bucket content. */
  readonly rect: QuireRect;
  /** Projected, page-local text fragments owned directly by the box. */
  readonly fragments: QuireTextFragment[];
  /** Projected, page-local child boxes owned by a container box. */
  readonly children: QuireLayoutBox[];
}

/** Mutable bucket used while collecting page-local content. */
interface MutableQuirePageContentBucket {
  /** Zero-based page index the content belongs to. */
  pageIndex: number;
  /** Projection that moves this bucket into its page body. */
  projection: QuirePageBodyProjection;
  /** Document range covered by the bucket content. */
  range: QuireDocumentRange;
  /** Page-local rectangle covered by the bucket content. */
  rect: QuireRect;
  /** Projected, page-local text fragments owned directly by the box. */
  fragments: QuireTextFragment[];
  /** Projected, page-local child boxes owned by a container box. */
  children: QuireLayoutBox[];
}

/**
 * Groups projected fragments and child boxes into per-page content buckets.
 *
 * Text fragments are assigned by source-flow ownership. Children that already
 * passed through recursive projection are assigned by page-local visual
 * intersection, then by measured range ownership as the migration fallback for
 * page-local fragments whose origin range still points at another page.
 *
 * @param options - Fragments, child boxes, and projections to group.
 * @returns Page content buckets ordered by ascending page index.
 */
export function bucketQuirePageContent(
  options: QuirePageContentBucketOptions
): readonly QuirePageContentBucket[] {
  const buckets = new Map<string, MutableQuirePageContentBucket>();

  bucketQuireTextFragmentsByPage({
    fragments: options.fragments,
    projections: options.projections,
    addProjectedFragment: (projection, fragment) => {
      addQuirePageContentBucketFragment(buckets, projection, fragment);
    }
  });

  for (const child of options.children) {
    const projection = findQuirePageBodyProjectionForProjectedChild(
      child,
      options.projections
    );

    if (projection === undefined) {
      continue;
    }

    addQuirePageContentBucketChild(buckets, projection, child);
  }

  return [...buckets.values()].sort((first, second) =>
    first.pageIndex - second.pageIndex ||
    (first.projection.columnIndex ?? 0) - (second.projection.columnIndex ?? 0)
  );
}

/**
 * Adds one projected text fragment to a page-local bucket.
 *
 * @param buckets - Bucket map keyed by page index.
 * @param projection - Page projection whose bucket should receive the fragment.
 * @param fragment - Projected fragment to append.
 * @returns Nothing.
 */
function addQuirePageContentBucketFragment(
  buckets: Map<string, MutableQuirePageContentBucket>,
  projection: QuirePageBodyProjection,
  fragment: QuireTextFragment
): void {
  resolveQuirePageContentBucket(
    buckets,
    projection,
    fragment.range,
    fragment.rect
  ).fragments.push(fragment);
}

/**
 * Adds one projected child box to a page-local bucket.
 *
 * @param buckets - Bucket map keyed by page index.
 * @param projection - Page projection whose bucket should receive the child.
 * @param child - Projected child box to append.
 * @returns Nothing.
 */
function addQuirePageContentBucketChild(
  buckets: Map<string, MutableQuirePageContentBucket>,
  projection: QuirePageBodyProjection,
  child: QuireLayoutBox
): void {
  resolveQuirePageContentBucket(
    buckets,
    projection,
    child.range,
    child.rect
  ).children.push(child);
}

/**
 * Resolves the mutable content bucket for a page index and expands its bounds.
 *
 * @param buckets - Bucket map keyed by page index.
 * @param projection - Page projection whose bucket should be resolved.
 * @param range - Content range that must be included in the bucket.
 * @param rect - Content rectangle that must be included in the bucket.
 * @returns Existing or newly created bucket for the page.
 */
function resolveQuirePageContentBucket(
  buckets: Map<string, MutableQuirePageContentBucket>,
  projection: QuirePageBodyProjection,
  range: QuireDocumentRange,
  rect: QuireRect
): MutableQuirePageContentBucket {
  const pageIndex = projection.page.pageIndex;
  const occurrence = resolveQuireProjectionOccurrence(projection);
  const existing = buckets.get(occurrence);

  if (existing !== undefined) {
    existing.range = expandQuirePageContentBucketRange(existing.range, range);
    existing.rect = expandQuirePageContentBucketRect(existing.rect, rect);
    return existing;
  }

  const created: MutableQuirePageContentBucket = {
    pageIndex,
    projection,
    range: {
      from: range.from,
      to: range.to
    },
    rect: {
      x: rect.x,
      y: rect.y,
      width: rect.width,
      height: rect.height
    },
    fragments: [],
    children: []
  };

  buckets.set(occurrence, created);

  return created;
}

/**
 * Expands a bucket document range.
 *
 * @param current - Current range.
 * @param next - Content range to include.
 * @returns Expanded document range.
 */
function expandQuirePageContentBucketRange(
  current: QuireDocumentRange,
  next: QuireDocumentRange
): QuireDocumentRange {
  return {
    from: Math.min(current.from, next.from),
    to: Math.max(current.to, next.to)
  };
}

/**
 * Expands a bucket rectangle.
 *
 * @param current - Current rectangle.
 * @param next - Content rectangle to include.
 * @returns Expanded rectangle.
 */
function expandQuirePageContentBucketRect(
  current: QuireRect,
  next: QuireRect
): QuireRect {
  const x = Math.min(current.x, next.x);
  const y = Math.min(current.y, next.y);
  const right = Math.max(current.x + current.width, next.x + next.width);
  const bottom = Math.max(current.y + current.height, next.y + next.height);

  return {
    x,
    y,
    width: right - x,
    height: bottom - y
  };
}
