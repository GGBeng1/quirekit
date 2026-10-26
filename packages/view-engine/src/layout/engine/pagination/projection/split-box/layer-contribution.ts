import type { QuireLayoutTranslation } from "../types";
import {
  filterQuireDisplayListToRect,
  intersectQuireRects,
  translateCompiledViewNode,
  type QuireDisplayCommand,
  type QuireRect
} from "@quirekit/renderer";
import {
  rewriteQuireLayerContributionBody,
  type QuireRetainedLayerContribution
} from "../../../../region-products";
import type {
  QuireLayoutRegionRef
} from "@quirekit/layout/identity";

/**
 * Projects one primary-owned contribution into a page visual instance.
 *
 * @param contribution - Source-flow contribution in document coordinates.
 * @param pageRegion - Concrete page-local retained region.
 * @param visualInstanceId - Stable page visual-instance id.
 * @param sourceRect - Logical source-region rectangle before fragmentation.
 * @param pageRect - Concrete page-local fragment rectangle.
 * @param translation - Explicit source-to-page translation, independent of clipping.
 * @returns Projected contribution, or null when it is outside the page fragment.
 */
export function projectQuireLayerContributionToPage(
  contribution: QuireRetainedLayerContribution,
  pageRegion: QuireLayoutRegionRef,
  visualInstanceId: string,
  sourceRect: QuireRect | undefined,
  pageRect: QuireRect,
  translation?: QuireLayoutTranslation
): QuireRetainedLayerContribution | null {
  if (sourceRect === undefined) {
    return null;
  }
  const dx = translation?.dx ?? pageRect.x - sourceRect.x;
  const dy = translation?.dy ?? pageRect.y - sourceRect.y;
  // Page membership is decided from the header alone, so a deferred body stays unread.
  const translatedRect = translateCompiledViewNode(
    { rect: contribution.rect, commands: [], domOverlays: [] },
    dx,
    dy
  ).rect;
  const translatedVisualBounds = contribution.visualBounds === undefined
    ? translatedRect
    : {
        x: contribution.visualBounds.x + dx,
        y: contribution.visualBounds.y + dy,
        width: contribution.visualBounds.width,
        height: contribution.visualBounds.height
      };
  const rect = intersectQuireRects(translatedRect, pageRect);
  if (rect === null) {
    return null;
  }
  const visualBounds = intersectQuireRects(translatedVisualBounds, pageRect);
  if (visualBounds === null) {
    return null;
  }

  return rewriteQuireLayerContributionBody(contribution, {
    contributionId: `${contribution.contributionId}:${visualInstanceId}`,
    owner: { ...contribution.owner, region: pageRegion },
    rect,
    ...(contribution.visualBounds === undefined ? {} : { visualBounds })
  }, (body) => {
    const translated = translateCompiledViewNode({ rect: contribution.rect, ...body }, dx, dy);
    // Filter in page coordinates first, then scope every retained identity and
    // wrap commands in the exact page clip so partial paint cannot escape.
    const visibleCommands = filterQuireDisplayListToRect({
      bounds: translatedVisualBounds,
      commands: translated.commands
    }, pageRect).commands.map((command) =>
      scopeQuireLayerContributionCommand(command, visualInstanceId)
    );
    const commands: readonly QuireDisplayCommand[] = visibleCommands.length === 0
      ? []
      : [{
          id: `${contribution.contributionId}:clip:${visualInstanceId}`,
          kind: "clip",
          range: contribution.range,
          layer: contribution.paintSurface,
          rect: visualBounds,
          commands: visibleCommands
        }];
    return {
      commands,
      domOverlays: translated.domOverlays.flatMap((overlay) => {
        const overlayRect = intersectQuireRects(overlay.rect, pageRect);
        return overlayRect === null
          ? []
          : [{
              ...overlay,
              id: `${overlay.id}:${visualInstanceId}`,
              rect: overlayRect
            }];
      }),
      targets: (translated.targets ?? []).flatMap((target) => {
        const targetRect = intersectQuireRects(target.rect, pageRect);
        return targetRect === null
          ? []
          : [{
              ...target,
              id: `${target.id}:${visualInstanceId}`,
              rect: targetRect
            }];
      })
    };
  });
}

/**
 * Rewrites one command tree with page-unique command ids.
 *
 * @param command - Translated command to scope.
 * @param visualInstanceId - Stable page visual-instance id.
 * @returns Command tree with every id suffixed by the visual instance.
 */
function scopeQuireLayerContributionCommand(
  command: QuireDisplayCommand,
  visualInstanceId: string
): QuireDisplayCommand {
  const id = `${command.id}:${visualInstanceId}`;
  return command.kind === "clip"
    ? {
        ...command,
        id,
        commands: command.commands.map((child) =>
          scopeQuireLayerContributionCommand(child, visualInstanceId)
        )
      }
    : { ...command, id };
}
