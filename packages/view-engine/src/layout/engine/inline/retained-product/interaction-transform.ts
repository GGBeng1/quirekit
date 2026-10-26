import {
  createQuireCenterRotationTransform,
  createQuireTransformedRectHitArea,
  intersectQuireRects,
  resolveQuirePointBounds,
  transformQuireHitArea,
  translateQuireHitArea,
  type QuireHitArea,
  type QuireRect
} from "@quirekit/renderer";
import {
  transformQuireDrawingSelectionProducts
} from "../../../../interaction/drawing-controller/products";
import {
  rewriteQuireLayerContributionBody,
  type QuireRetainedLayerContributionDeclaration
} from "../../../region-products";

import type { QuireInlineInteractionTargetGeometry } from "./types";

/**
 * Resolves object-body target geometry from the accepted rectangle.
 *
 * @param rect - Accepted page-local object frame.
 * @param rotation - Optional clockwise interaction rotation.
 * @param pageRect - Optional immutable owning-page clip.
 * @param localHitArea - Optional source-owned exact hit polygon in frame-local coordinates.
 * @returns Coarse bounds plus exact transformed geometry.
 */
export function resolveQuireInlineInteractionTargetGeometry(
  rect: QuireRect,
  rotation: number | undefined,
  pageRect: QuireRect | undefined,
  localHitArea?: QuireHitArea
): QuireInlineInteractionTargetGeometry {
  if (localHitArea !== undefined) {
    // Keep exact geometry separate from the source extent: expanding a pointer
    // corridor must never alter layout, wrap, or the center used for rotation.
    let hitArea = translateQuireHitArea(localHitArea, rect.x, rect.y);
    if (rotation !== undefined && rotation % 360 !== 0) {
      hitArea = transformQuireHitArea(hitArea, createQuireCenterRotationTransform(rect, rotation));
    }
    const bounds = resolveQuirePointBounds(hitArea.points);
    return { rect: pageRect === undefined ? bounds : intersectQuireRects(bounds, pageRect), hitArea };
  }
  if (rotation === undefined || rotation % 360 === 0) {
    return {
      rect: pageRect === undefined ? rect : intersectQuireRects(rect, pageRect)
    };
  }

  const transform = createQuireCenterRotationTransform(rect, rotation);
  const hitArea = createQuireTransformedRectHitArea(rect, transform);
  const bounds = resolveQuirePointBounds(hitArea.points);
  return {
    rect: pageRect === undefined ? bounds : intersectQuireRects(bounds, pageRect),
    hitArea
  };
}

/**
 * Applies one drawing rotation to compiled selected-only artifacts.
 *
 * @param contribution - Compiled selected-only contribution.
 * @param rect - Accepted drawing frame.
 * @param rotation - Optional clockwise interaction rotation.
 * @returns Contribution with transformed commands and exact targets.
 */
export function transformQuireInlineSelectedContribution(
  contribution: QuireRetainedLayerContributionDeclaration,
  rect: QuireRect,
  rotation: number | undefined
): QuireRetainedLayerContributionDeclaration {
  if (rotation === undefined || rotation % 360 === 0) {
    return contribution;
  }

  return rewriteQuireLayerContributionBody(contribution, {}, (body) => {
    const products = transformQuireDrawingSelectionProducts({
      commands: body.commands,
      targets: body.targets,
      frame: { rect, rotation }
    });
    return { commands: products.commands, domOverlays: body.domOverlays, targets: products.targets };
  });
}
