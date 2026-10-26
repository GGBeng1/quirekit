import { matchesQuireLogicalRegion } from "../../../../owner-facts/region";
import { intersectQuireRects, translateQuireHitArea } from "@quirekit/renderer";
import type { QuireLayoutRegionRef } from "@quirekit/layout/identity";
import type { QuireHitTarget, QuireLayoutBox } from "../../../types";
import type { QuireViewInteractionHit } from "../../../../../view-graph";
import type { QuireLayoutTranslation } from "../types";

/**
 * Projects one primary-region hit target to the page-local visual instance.
 *
 * @param target - Source-flow hit target.
 * @param sourceRegion - Logical primary region before fragmentation.
 * @param pageRegion - Concrete page-local region reference.
 * @param visualInstanceId - Stable id of the page-local occurrence.
 * @param sourceRect - Logical primary-region geometry before fragmentation.
 * @param pageRect - Concrete page-local primary-region geometry.
 * @param translation - Explicit source-to-page translation, independent of clipping.
 * @returns Original target, projected page target, or null outside the page fragment.
 */
export function projectPrimaryHitTarget(
  target: QuireHitTarget,
  sourceRegion: QuireLayoutRegionRef,
  pageRegion: QuireLayoutRegionRef,
  visualInstanceId: string,
  sourceRect: QuireLayoutBox["rect"] | undefined,
  pageRect: QuireLayoutBox["rect"],
  translation?: QuireLayoutTranslation
): QuireHitTarget | null {
  const ownsPrimaryRegion = target.viewRegion !== undefined
    && matchesQuireLogicalRegion(target.viewRegion, sourceRegion);
  const queryOwnerOwnsPrimaryRegion = target.queryOwner?.region !== undefined
    && matchesQuireLogicalRegion(target.queryOwner.region, sourceRegion);
  const interactionOwnsPrimaryRegion = target.interactionHit !== undefined
    && matchesQuireLogicalRegion(target.interactionHit.region, sourceRegion);

  if (
    !ownsPrimaryRegion
    && !queryOwnerOwnsPrimaryRegion
    && !interactionOwnsPrimaryRegion
  ) {
    return target;
  }

  const projectedRect = sourceRect === undefined
    ? target.rect
    : projectPrimaryTargetRect(target.rect, sourceRect, pageRect, translation);
  if (projectedRect === null) {
    return null;
  }

  return {
    ...target,
    id: `${target.id}:${visualInstanceId}`,
    rect: projectedRect,
    ...(target.hitArea === undefined || sourceRect === undefined
      ? {}
      : {
          hitArea: translateQuireHitArea(
            target.hitArea,
            translation?.dx ?? pageRect.x - sourceRect.x,
            translation?.dy ?? pageRect.y - sourceRect.y
          )
        }),
    ...(ownsPrimaryRegion ? { viewRegion: pageRegion } : {}),
    ...(queryOwnerOwnsPrimaryRegion
      ? {
          queryOwner: {
            ...target.queryOwner,
            sourceFragmentId: visualInstanceId,
            region: pageRegion
          }
        }
      : {}),
    ...(interactionOwnsPrimaryRegion
      ? {
          interactionHit: projectInteractionHitRegion(
            target.interactionHit!,
            pageRegion
          )
        }
      : {})
  };
}

/**
 * Projects and clips one primary-owned target into a page-local region.
 *
 * @param target - Target rectangle in source-flow document coordinates.
 * @param source - Logical primary-region rectangle before fragmentation.
 * @param page - Concrete page-local primary-region rectangle.
 * @param translation - Explicit source-to-page translation, independent of clipping.
 * @returns Page-local target intersection, or null when not visible.
 */
function projectPrimaryTargetRect(
  target: QuireLayoutBox["rect"],
  source: QuireLayoutBox["rect"],
  page: QuireLayoutBox["rect"],
  translation?: QuireLayoutTranslation
): QuireLayoutBox["rect"] | null {
  const translated = {
    ...target,
    x: target.x + (translation?.dx ?? page.x - source.x),
    y: target.y + (translation?.dy ?? page.y - source.y)
  };
  return intersectQuireRects(translated, page);
}

/**
 * Rewrites the common region field on one canonical interaction hit.
 *
 * @param hit - Source-flow interaction hit.
 * @param region - Page-local retained region.
 * @returns Interaction hit with unchanged semantic payload and new ownership.
 */
function projectInteractionHitRegion(
  hit: QuireViewInteractionHit,
  region: QuireLayoutRegionRef
): QuireViewInteractionHit {
  return { ...hit, region };
}
