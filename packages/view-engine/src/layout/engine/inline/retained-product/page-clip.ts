import {
  filterQuireDisplayListToRect,
  intersectQuireRects,
  type QuireDisplayCommand,
  type QuireRect
} from "@quirekit/renderer";
import {
  rewriteQuireLayerContributionBody,
  type QuireRetainedLayerContributionDeclaration
} from "../../../region-products";

/** Page-local retained artifacts derived from one full authored contribution. */
export interface QuireInlineRetainedPageClipResult {
  /** Contribution whose paint and mounted artifacts are hard-clipped to the page. */
  readonly contribution: QuireRetainedLayerContributionDeclaration;
  /** Visible object-frame rectangle used by the canonical body hit target. */
  readonly targetRect: QuireRect | null;
}

/**
 * Clips one anchored-object occurrence without changing its authored frame.
 *
 * The contribution rectangle remains the full placement authority required by
 * nested drawing stories. Only renderer artifacts are projected through the
 * immutable page clip, so an oversized object cannot continue through a page
 * gap while source geometry and independent story layout remain unchanged.
 *
 * @param contribution - Full retained declaration compiled from source geometry.
 * @param pageRect - Exact page rectangle that owns this visual occurrence.
 * @returns Page-clipped artifacts plus the visible body-target rectangle.
 */
export function clipQuireInlineRetainedContributionToPage(
  contribution: QuireRetainedLayerContributionDeclaration,
  pageRect: QuireRect
): QuireInlineRetainedPageClipResult {
  const rect = contribution.rect;
  const artifactBounds = contribution.visualBounds ?? rect;
  if (rect === undefined || artifactBounds === undefined) {
    return { contribution, targetRect: null };
  }
  const targetRect = intersectQuireRects(rect, pageRect);
  const clipRect = intersectQuireRects(artifactBounds, pageRect);

  return {
    contribution: rewriteQuireLayerContributionBody(contribution, {}, (body) => {
      const visibleCommands = clipRect === null
        ? []
        : filterQuireDisplayListToRect({
            bounds: artifactBounds,
            commands: body.commands
          }, pageRect).commands;
      const commands: readonly QuireDisplayCommand[] = clipRect === null
        || visibleCommands.length === 0
        ? []
        : [{
            id: `${contribution.contributionId ?? "anchored-object"}:page-clip`,
            kind: "clip",
            ...(contribution.range === undefined ? {} : { range: contribution.range }),
            ...(contribution.paintSurface === undefined
              ? {}
              : { layer: contribution.paintSurface }),
            rect: clipRect,
            commands: visibleCommands
          }];
      return {
        commands,
        domOverlays: body.domOverlays.flatMap((overlay) => {
          const visibleRect = intersectQuireRects(overlay.rect, pageRect);
          return visibleRect === null ? [] : [{ ...overlay, rect: visibleRect }];
        }),
        targets: body.targets.flatMap((target) => {
          const visibleRect = intersectQuireRects(target.rect, pageRect);
          return visibleRect === null ? [] : [{ ...target, rect: visibleRect }];
        })
      };
    }),
    targetRect
  };
}
