import {
  createQuireChildFlowResult,
  type QuireChildFlowFragment,
  type QuireChildFlowSourceBand
} from "@quirekit/layout/child-flow";
import {
  intersectQuireRects,
  type QuireRect
} from "@quirekit/renderer";
import {
  createQuireSubLayoutProjection,
  type QuireLayoutBoxSubLayoutFragment,
  type QuireSubLayoutFragmentSource,
  type QuireSubLayoutProjection
} from "../../../../sub-layout";
import { projectQuireLayoutBoxToFlowClip } from "../../flow-clip-projector";
import { createQuireProjectionSourceFlowClip } from "../../source-flow";
import type { QuirePageBodyProjection } from "../../types";
import { translateQuireRect } from "../../translate";
import { projectQuireSubLayoutProjectionVisualInstance } from "../../sub-layout-visual-instance";
import { projectQuireSubLayoutQueryProductsToPage } from "./products";
import { resolveQuireProjectionOccurrence } from "../../occurrence";

/** Canonical fragment and explicit View source produced by page projection. */
interface ProjectedQuireSubLayoutFragment {
  /** Consumer-neutral page-local child geometry. */
  readonly geometry: QuireChildFlowFragment;
  /** View source box keyed to the page-local fragment identity. */
  readonly source: QuireSubLayoutFragmentSource;
}

/**
 * Projects one retained child-flow projection into one page occurrence.
 *
 * @param source - Source-flow geometry and View sidecar.
 * @param projection - Page projection to attempt.
 * @returns Page-local retained fragment, or null when no child content is accepted.
 */
export function projectQuireSubLayoutProjectionToPage(
  source: QuireSubLayoutProjection,
  projection: QuirePageBodyProjection
): QuireLayoutBoxSubLayoutFragment | null {
  const sourceGeometry = source.geometry;
  const flowClip = createQuireProjectionSourceFlowClip(projection);
  const pageFlowRect = {
    x: sourceGeometry.contentClip.x,
    y: flowClip.top,
    width: sourceGeometry.contentClip.width,
    height: flowClip.bottom - flowClip.top
  };
  const sourceContentClip = intersectQuireRects(
    sourceGeometry.contentClip,
    pageFlowRect
  );
  const sourceInteractionClip = intersectQuireRects(
    sourceGeometry.interactionClip,
    pageFlowRect
  );

  if (sourceContentClip === null || sourceInteractionClip === null) {
    return null;
  }

  // Geometry and source provenance are projected together but remain separate contracts.
  const id = `${sourceGeometry.id}:page:${resolveQuireProjectionOccurrence(projection)}`;
  const projectedFragments = sourceGeometry.fragments.flatMap((fragment) =>
    projectChildFragment(
      fragment,
      source,
      projection,
      sourceContentClip,
      id
    )
  );
  if (projectedFragments.length === 0) {
    return null;
  }

  const contentClip = translateQuireRect(sourceContentClip, projection);
  const interactionClip = translateQuireRect(sourceInteractionClip, projection);
  const acceptedBand = projectAcceptedBand(sourceGeometry, sourceContentClip);
  if (acceptedBand.bottom <= acceptedBand.top) {
    return null;
  }

  const root = {
    ...sourceGeometry.root,
    placement: {
      ...sourceGeometry.root.placement,
      rect: projectPlacementRect(
        sourceGeometry.root.placement.rect,
        sourceContentClip,
        projection,
        contentClip
      ),
      contentRect: contentClip,
      clipRect: interactionClip
    }
  };
  const geometry = createQuireChildFlowResult({
    id,
    trackId: `${sourceGeometry.trackId}:page:${resolveQuireProjectionOccurrence(projection)}`,
    root,
    acceptedBand,
    fragments: projectedFragments.map((fragment) => fragment.geometry),
    localToResult: {
      x: sourceGeometry.localToResult.x + projection.dx,
      y: sourceGeometry.localToResult.y + projection.dy
    },
    coordinateSpace: sourceGeometry.coordinateSpace,
    contentClip,
    interactionClip,
    continuation: sourceGeometry.continuation === null
      ? null
      : {
          ...sourceGeometry.continuation,
          pageIndex: projection.page.pageIndex,
          previousResultId: id,
          previousAcceptedBand: acceptedBand
        },
    dependencySignature: sourceGeometry.dependencySignature,
    ...(sourceGeometry.dependencyCheckpoints === undefined
      ? {}
      : { dependencyCheckpoints: sourceGeometry.dependencyCheckpoints })
  });
  const pageProjection = createQuireSubLayoutProjection({
    geometry,
    root: source.view.root,
    fragmentSources: projectedFragments.map((fragment) => fragment.source),
    queryProducts: projectQuireSubLayoutQueryProductsToPage(
      source,
      sourceInteractionClip,
      projection,
      id
    )
  });

  return {
    subLayout: projectQuireSubLayoutProjectionVisualInstance(
      pageProjection,
      {
        sourceClip: sourceInteractionClip,
        translation: projection
      }
    )
  };
}

/**
 * Projects one source child through the page and owning child-flow clips.
 *
 * @param fragment - Canonical source child fragment.
 * @param source - Owning source projection with explicit View provenance.
 * @param projection - Page projection to apply.
 * @param sourceContentClip - Intersected source-flow content clip.
 * @param resultId - Page-local result identity.
 * @returns Page-local canonical fragments and matching View sources.
 */
function projectChildFragment(
  fragment: QuireChildFlowFragment,
  source: QuireSubLayoutProjection,
  projection: QuirePageBodyProjection,
  sourceContentClip: QuireRect,
  resultId: string
): readonly ProjectedQuireSubLayoutFragment[] {
  const sourceBox = source.view.fragmentSources.find((entry) =>
    entry.fragmentId === fragment.id
  )?.sourceBox;
  if (sourceBox === undefined) {
    return [];
  }

  const flowClip = createQuireProjectionSourceFlowClip(projection);
  const boxes = projectQuireLayoutBoxToFlowClip({
    box: sourceBox,
    projection,
    flowClip,
    rectClip: sourceContentClip,
    suffix: `:${resultId}`
  });

  return boxes.map((box, index) => {
    const fragmentId = `${fragment.id}:page:${resolveQuireProjectionOccurrence(projection)}:${index}`;
    const geometry: QuireChildFlowFragment = {
      id: fragmentId,
      sourceId: fragment.sourceId,
      range: box.range,
      rect: box.rect,
      localRect: fragment.localRect,
      clipRect: translateQuireRect(sourceContentClip, projection),
      ...(box.textFragments === undefined
        ? {}
        : { textFragments: box.textFragments })
    };

    return {
      geometry,
      source: { fragmentId, sourceBox: box }
    };
  });
}

/**
 * Projects a root placement rectangle, falling back to the accepted content clip.
 *
 * @param rect - Source root placement rectangle.
 * @param sourceClip - Accepted source-flow content clip.
 * @param projection - Page projection to apply.
 * @param acceptedContentClip - Page-local accepted content clip.
 * @returns Page-local placement rectangle.
 */
function projectPlacementRect(
  rect: QuireRect,
  sourceClip: QuireRect,
  projection: QuirePageBodyProjection,
  acceptedContentClip: QuireRect
): QuireRect {
  const clipped = intersectQuireRects(rect, sourceClip);
  return clipped === null
    ? acceptedContentClip
    : translateQuireRect(clipped, projection);
}

/**
 * Intersects the local accepted source band with the page-visible visual band.
 *
 * @param geometry - Source child-flow geometry.
 * @param sourceClip - Accepted source visual clip.
 * @returns Local source-flow band represented by the page result.
 */
function projectAcceptedBand(
  geometry: QuireSubLayoutProjection["geometry"],
  sourceClip: QuireRect
): QuireChildFlowSourceBand {
  const localTop = sourceClip.y - geometry.localToResult.y;
  const localBottom = sourceClip.y + sourceClip.height - geometry.localToResult.y;
  return {
    top: Math.max(geometry.acceptedBand.top, localTop),
    bottom: Math.min(geometry.acceptedBand.bottom, localBottom)
  };
}
