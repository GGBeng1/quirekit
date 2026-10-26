import { doQuireRectsIntersect } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import type { QuireLayoutBox } from "../../../types";
import {
  doesQuireTextFragmentStartInFlowBand,
  findQuirePageBodyProjectionForRange
} from "@quirekit/layout/pagination";
import { doQuireDocumentRangesIntersect } from "@quirekit/renderer";
import { isQuireLayoutContainer } from "../guards";
import { readQuireSubLayoutFragments } from "../../../sub-layout";
import {
  createQuireProjectionSourceFlowClip,
  hasQuireMeasuredSourceFlowClip
} from "../source-flow";
import type { QuirePageBodyProjection } from "../types";

/**
 * Finds a whole-box projection only when range and measured flow both agree.
 *
 * Range containment remains the first gate. Splittable boxes must also fit the
 * projection's measured source-flow band. Otherwise a long paragraph or
 * recursive container can be incorrectly translated as a single page-local
 * rectangle.
 *
 * @param box - Layout box that may be projected as a whole.
 * @param projections - Available page-body projections.
 * @returns Projection that can own the complete box, or undefined.
 */
export function findQuirePageBodyProjectionForCompleteBox(
  box: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[]
): QuirePageBodyProjection | undefined {
  const projection = findQuirePageBodyProjectionForRange(box.range, projections);

  if (
    projection === undefined ||
    !isQuireSplittableLayoutBox(box)
  ) {
    return projection;
  }

  return doesQuireLayoutBoxFitProjectionFlow(box, projection)
    ? projection
    : undefined;
}

/**
 * Finds the page projection that owns a text fragment's visual line anchor.
 *
 * Measured source-flow bands are authoritative because they come from accepted
 * pagination items.
 *
 * @param fragment - Source text fragment to place.
 * @param projections - Available page-body projections.
 * @returns Matching projection, or undefined when the fragment is outside every page clip.
 */
export function findQuirePageBodyProjectionForTextFragment(
  fragment: QuireTextFragment,
  projections: readonly QuirePageBodyProjection[]
): QuirePageBodyProjection | undefined {
  return projections.find((projection) => {
    const flowClip = createQuireProjectionSourceFlowClip(projection);

    return doesQuireTextFragmentStartInFlowBand(fragment, flowClip);
  });
}

/**
 * Finds the page projection that owns an already-projected child box.
 *
 * Children have already passed through recursive projection before they are
 * bucketed into a straddling parent. Their page-local rectangle is more reliable
 * than semantic range because vMerge cells and other nested continuations may
 * retain an origin range from another page. The range fallback remains measured
 * only, matching page-body projection creation.
 *
 * @param child - Projected child layout box to bucket.
 * @param projections - Available page-body projections.
 * @returns Matching projection, or undefined when no page owns the child.
 */
export function findQuirePageBodyProjectionForProjectedChild(
  child: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[]
): QuirePageBodyProjection | undefined {
  const visualProjection = projections.find((projection) =>
    hasQuireMeasuredSourceFlowClip(projection) &&
    doQuireRectsIntersect(child.rect, projection.page.rect)
  );

  const rangeProjection = findQuirePageBodyProjectionForRange(
    child.range,
    projections
  );

  if (
    visualProjection !== undefined ||
    rangeProjection === undefined ||
    !hasQuireMeasuredSourceFlowClip(rangeProjection)
  ) {
    return visualProjection;
  }

  return rangeProjection;
}

/**
 * Keeps boxes whose document range meets at least one active page projection.
 *
 * A box outside every active page range owns no content on those pages, so
 * windowed projection need not translate or split it.
 *
 * @param boxes - Source-flow boxes in document order.
 * @param projections - Active page projections.
 * @returns The same array when nothing is removed, otherwise the kept boxes.
 */
export function filterQuireLayoutBoxesByProjectionRanges<Box extends Pick<QuireLayoutBox, "range">>(
  boxes: readonly Box[],
  projections: readonly QuirePageBodyProjection[]
): readonly Box[] {
  const filtered: Box[] = [];

  for (let index = 0; index < boxes.length; index += 1) {
    const box = boxes[index]!;
    if (doesQuireLayoutBoxIntersectProjectionRange(box, projections)) {
      filtered.push(box);
    }
  }

  return filtered.length === boxes.length ? boxes : filtered;
}

/**
 * Keeps container children that can contribute content to the active pages.
 *
 * Bucketing owns children by page-local source-flow geometry before range, so
 * a child is dropped only when both its range and its flow box miss every
 * active page. Children with visual overflow or nested owners are always kept.
 *
 * @param children - Source-flow children of a straddling container.
 * @param projections - Active page projections.
 * @returns The same array when nothing is removed, otherwise the kept children.
 */
export function filterQuireContainerChildrenForProjections(
  children: readonly QuireLayoutBox[],
  projections: readonly QuirePageBodyProjection[]
): readonly QuireLayoutBox[] {
  if (!projections.every(hasQuireMeasuredSourceFlowClip)) return children;
  const bands = projections.map(createQuireProjectionSourceFlowClip);
  const kept: QuireLayoutBox[] = [];

  for (let index = 0; index < children.length; index += 1) {
    const child = children[index]!;
    if (mayQuireChildContributeToProjections(child, projections, bands)) {
      kept.push(child);
    }
  }

  return kept.length === children.length ? children : kept;
}

/**
 * Checks whether one child can own content on an active page.
 *
 * @param child - Source-flow child box.
 * @param projections - Active page projections.
 * @param bands - Source-flow bands parallel to the projections.
 * @returns Whether projection must still consider the child.
 */
function mayQuireChildContributeToProjections(
  child: QuireLayoutBox,
  projections: readonly QuirePageBodyProjection[],
  bands: readonly { readonly top: number; readonly bottom: number }[]
): boolean {
  if (
    child.table !== undefined
    || child.paintBounds !== undefined
    || child.paintTransform !== undefined
    || child.regionProducts !== undefined
    || readQuireSubLayoutFragments(child).length > 0
    || doesQuireLayoutBoxIntersectProjectionRange(child, projections)
  ) {
    return true;
  }
  const top = child.rect.y;
  const bottom = child.rect.y + Math.max(0, child.rect.height);
  return bands.some((band) => top <= band.bottom && bottom >= band.top);
}

/**
 * Checks whether a box belongs to any active page projection by document range.
 *
 * @param box - Projected or source-flow layout box.
 * @param projections - Active page projections.
 * @returns Whether at least one active page range intersects the box range.
 */
export function doesQuireLayoutBoxIntersectProjectionRange(
  box: Pick<QuireLayoutBox, "range">,
  projections: readonly QuirePageBodyProjection[]
): boolean {
  for (let index = 0; index < projections.length; index += 1) {
    if (doQuireDocumentRangesIntersect(projections[index]!.page.range, box.range)) {
      return true;
    }
  }

  return false;
}

/**
 * Checks whether a box carries content that can be recursively fragmented.
 *
 * @param box - Layout box to inspect.
 * @returns Whether projection should honor measured source-flow ownership.
 */
function isQuireSplittableLayoutBox(box: QuireLayoutBox): boolean {
  return (
    (box.textFragments?.length ?? 0) > 0 ||
    box.table !== undefined ||
    readQuireSubLayoutFragments(box).length > 0 ||
    isQuireLayoutContainer(box)
  );
}

/**
 * Checks whether a box fits inside a projection's accepted source-flow band.
 *
 * @param box - Layout box in source-flow coordinates.
 * @param projection - Page-body projection with measured source-flow ownership.
 * @returns Whether the whole box can be translated without recursive splitting.
 */
function doesQuireLayoutBoxFitProjectionFlow(
  box: QuireLayoutBox,
  projection: QuirePageBodyProjection
): boolean {
  const flowClip = createQuireProjectionSourceFlowClip(projection);
  const boxBottom = box.rect.y + box.rect.height;

  return box.rect.y >= flowClip.top && boxBottom <= flowClip.bottom;
}
