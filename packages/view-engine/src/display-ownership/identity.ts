import { doQuireRectsIntersect } from "@quirekit/renderer";
import type { QuireLayoutOwnerFacts } from "@quirekit/layout/products";
import type {
  QuireRetainedDisplayOwner,
  QuireRetainedDisplayOwnerKind,
  QuireRetainedDisplayPaintScope
} from "./types";

/**
 * Creates one stable display-owner key from canonical ownership facts.
 *
 * @param kind - Retained product category represented by the owner.
 * @param paintScope - Exact paint responsibility owned by the product.
 * @param productId - Stable product id supplied by layout or a render producer.
 * @param owner - Explicit root/region/source/capability authority.
 * @returns Collision-safe owner key.
 */
export function createQuireRetainedDisplayOwnerKey(
  kind: QuireRetainedDisplayOwnerKind,
  paintScope: QuireRetainedDisplayPaintScope,
  productId: string,
  owner: QuireLayoutOwnerFacts
): string {
  return JSON.stringify([
    kind,
    paintScope,
    owner.region.rootId.value,
    owner.region.regionId.value,
    owner.region.visualInstanceId ?? null,
    owner.source.sourceId,
    owner.capabilities.editable,
    owner.capabilities.selectable,
    owner.capabilities.focusable,
    owner.capabilities.copyable,
    owner.capabilities.commandable,
    owner.capabilities.accessible,
    productId
  ]);
}

/**
 * Resolves pages whose rectangles intersect one direct owner.
 *
 * @param rect - Document-space owner rectangle.
 * @param pages - Candidate paginated page rectangles.
 * @returns Page indexes in deterministic page order.
 */
export function resolveQuireDisplayOwnerPageIndexes(
  rect: QuireRetainedDisplayOwner["rect"],
  pages: readonly {
    /** Zero-based page index. */
    readonly pageIndex: number;
    /** Page rectangle in document space. */
    readonly pageRect: QuireRetainedDisplayOwner["rect"];
  }[]
): readonly number[] {
  let pageIndexes: number[] | undefined;
  let single: number | undefined;
  for (const page of pages) {
    if (!doQuireRectsIntersect(rect, page.pageRect)) continue;
    if (single === undefined && pageIndexes === undefined) {
      single = page.pageIndex;
      continue;
    }
    pageIndexes ??= [single!];
    pageIndexes.push(page.pageIndex);
  }
  if (pageIndexes !== undefined) return pageIndexes;
  return single === undefined ? noPageIndexes : readSinglePageIndexes(single);
}

/** Shared result for owners outside every page. */
const noPageIndexes: readonly number[] = Object.freeze([]);
/** Shared results for owners on exactly one page, which is almost every owner. */
const singlePageIndexes: (readonly number[])[] = [];

/**
 * Reads the shared single-page result.
 *
 * @param pageIndex - Zero-based page index.
 * @returns Frozen one-element page index list.
 */
function readSinglePageIndexes(pageIndex: number): readonly number[] {
  return singlePageIndexes[pageIndex] ??= Object.freeze([pageIndex]);
}

/**
 * Computes one document-space union for a non-empty owner rectangle set.
 *
 * @param rects - Non-empty document-space rectangles.
 * @returns Bounding rectangle containing every input.
 */
export function unionQuireDisplayOwnerRects(
  rects: readonly QuireRetainedDisplayOwner["rect"][]
): QuireRetainedDisplayOwner["rect"] {
  let left = Number.POSITIVE_INFINITY;
  let top = Number.POSITIVE_INFINITY;
  let right = Number.NEGATIVE_INFINITY;
  let bottom = Number.NEGATIVE_INFINITY;
  for (const rect of rects) {
    left = Math.min(left, rect.x);
    top = Math.min(top, rect.y);
    right = Math.max(right, rect.x + rect.width);
    bottom = Math.max(bottom, rect.y + rect.height);
  }
  return { x: left, y: top, width: right - left, height: bottom - top };
}
