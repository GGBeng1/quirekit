import { intersectQuireRects } from "@quirekit/renderer";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireHitTarget } from "../../../../types";
import type {
  QuireSubLayoutQueryProducts,
  QuireSubLayoutProjection
} from "../../../../sub-layout";
import type { QuirePageBodyProjection } from "../../types";
import { translateQuireRect } from "../../translate";
import { getQuireSubLayoutTextOccurrenceKey } from "../../../../sub-layout/text-identity";
import { clipQuireSubLayoutTextLine } from "../../../../sub-layout/text-line-clip";
import { resolveQuireProjectionOccurrence } from "../../occurrence";

/**
 * Projects retained query products through one page-local source clip.
 *
 * Ownership is deliberately regenerated from the projected result. Carrying a
 * source-flow query owner forward would retain the wrong fragment identity and
 * coordinate path after pagination.
 *
 * @param source - Source-flow geometry and View sidecar.
 * @param sourceClip - Visible page band in source-flow document coordinates.
 * @param projection - Page-body projection applied to accepted products.
 * @param fragmentId - Page-local sub-layout fragment id.
 * @returns Clipped page-local query products.
 */
export function projectQuireSubLayoutQueryProductsToPage(
  source: QuireSubLayoutProjection,
  sourceClip: QuireRect,
  projection: QuirePageBodyProjection,
  fragmentId: string
): QuireSubLayoutQueryProducts {
  const products = source.view.queryProducts;
  const visibleTextFragments = new Set<string>();
  const selectionRects = products.selectionRects.flatMap((entry) => {
    const clipped = clipQuireSubLayoutTextLine(entry.rect, sourceClip);
    const rect = clipped === null ? null : translateQuireRect(clipped, projection);
    if (rect !== null) {
      visibleTextFragments.add(getQuireSubLayoutTextOccurrenceKey(entry));
    }
    return rect === null
      ? []
      : [{ textFragmentId: entry.textFragmentId, range: entry.range, rect }];
  });

  // A visible line owns all of its source endpoints, including caret ink outside
  // the page clip. Query geometry remains complete; painted overlays apply clips.
  return {
    selectionRects,
    caretStops: products.caretStops.flatMap((entry) => {
      return !visibleTextFragments.has(getQuireSubLayoutTextOccurrenceKey(entry))
        ? []
        : [{
            textFragmentId: entry.textFragmentId,
            position: entry.position,
            rect: translateQuireRect(entry.rect, projection),
            ...(entry.lineBaseline === undefined
              ? {}
              : { lineBaseline: entry.lineBaseline + projection.dy }),
            fragmentId: entry.fragmentId === undefined
              ? fragmentId
              : `${entry.fragmentId}:page:${resolveQuireProjectionOccurrence(projection)}`
          }];
    }),
    hitTargets: products.hitTargets.flatMap((target) => {
      const projected = projectHitTarget(
        target,
        sourceClip,
        projection,
        source,
        fragmentId
      );
      return projected === null ? [] : [projected];
    }),
    inputAnchors: products.inputAnchors.flatMap((entry) => {
      const rect = projectProductRect(entry.rect, sourceClip, projection);
      return rect === null
        ? []
        : [{ position: entry.position, rect, role: entry.role }];
    })
  };
}

/**
 * Projects one retained hit target while preserving semantic hit payload.
 *
 * @param target - Source-flow hit target.
 * @param sourceClip - Visible page band in source-flow coordinates.
 * @param projection - Owning page projection.
 * @param source - Source projection that owns the target.
 * @param fragmentId - Page-local fragment identity.
 * @returns Page-local hit target, or null outside the page clip.
 */
function projectHitTarget(
  target: QuireHitTarget,
  sourceClip: QuireRect,
  projection: QuirePageBodyProjection,
  source: QuireSubLayoutProjection,
  fragmentId: string
): QuireHitTarget | null {
  const rect = projectProductRect(target.rect, sourceClip, projection);
  if (rect === null) {
    return null;
  }
  const ownership = source.view.root.ownership;
  const sourceRegion = ownership.status === "resolved"
    ? ownership.owner.region
    : undefined;
  const pageRegion = sourceRegion === undefined
    ? undefined
    : { ...sourceRegion, visualInstanceId: fragmentId };
  const interactionHit = target.interactionHit === undefined || pageRegion === undefined
    ? target.interactionHit
    : { ...target.interactionHit, region: pageRegion };
  const owner = ownership.status === "resolved" ? ownership.owner : undefined;
  const sourceCapability = target.source ?? owner?.source;
  const capabilities = target.capabilities ?? owner?.capabilities;

  return {
    id: `${target.id}:page:${resolveQuireProjectionOccurrence(projection)}`,
    range: target.range,
    rect,
    ...(target.nodeHandle === undefined ? {} : { nodeHandle: target.nodeHandle }),
    ...(pageRegion === undefined ? {} : { viewRegion: pageRegion }),
    ...(sourceCapability === undefined ? {} : { source: sourceCapability }),
    ...(capabilities === undefined ? {} : { capabilities }),
    ...(target.layer === undefined ? {} : { layer: target.layer }),
    ...(target.pointerPolicy === undefined
      ? {}
      : { pointerPolicy: target.pointerPolicy }),
    ...(interactionHit === undefined ? {} : { interactionHit })
  };
}

/**
 * Clips one product rectangle before moving it into page coordinates.
 *
 * @param rect - Product rectangle in source-flow document coordinates.
 * @param sourceClip - Visible page clip in source-flow document coordinates.
 * @param projection - Page-body translation.
 * @returns Projected intersection, or null when invisible.
 */
function projectProductRect(
  rect: QuireRect,
  sourceClip: QuireRect,
  projection: QuirePageBodyProjection
): QuireRect | null {
  const clipped = intersectQuireRects(rect, sourceClip);
  return clipped === null ? null : translateQuireRect(clipped, projection);
}
