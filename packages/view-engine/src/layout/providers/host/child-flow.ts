import {
  layoutQuireChildFlow,
  type QuireChildFlowItem,
  type QuireChildFlowRoot,
  type QuireChildFlowTrack
} from "@quirekit/layout/child-flow";
import type {
  QuireLayoutBox,
  QuireLayoutContainer
} from "../../engine/types";
import type {
  QuireLayoutProviderChildFlowRequest,
  QuireLayoutProviderChildFlowResult,
  QuireLayoutProviderFlowTrack
} from "../types";
import { materializeQuireLayoutProviderFlow } from "./flow-geometry";

/**
 * Flows provider children through consumer-neutral recursive child geometry.
 *
 * Provider ownership and interaction facts remain in the View host. Only
 * canonical geometry crosses into `@quirekit/layout`, then the host attaches
 * one explicit View sidecar per result identity.
 *
 * @param request - Source-order children and explicit visual tracks.
 * @returns Visual children plus query-bearing View projections.
 */
export function flowQuireLayoutProviderBlockChildren(
  request: QuireLayoutProviderChildFlowRequest
): QuireLayoutProviderChildFlowResult {
  const geometry = layoutQuireChildFlow({
    root: createFlowRoot(request, request.source),
    items: request.source.children.map(createFlowItem),
    tracks: request.tracks.map(createGeometryTrack),
    sourceBand: { top: 0, bottom: request.source.rect.height }
  });
  const materialized = materializeQuireLayoutProviderFlow(geometry.results, request);

  return {
    children: materialized.children,
    fragments: materialized.fragments,
    nextSourceFlowY: geometry.nextSourceFlowY,
    complete: geometry.complete
  };
}

/**
 * Creates the consumer-neutral recursive root for provider child flow.
 *
 * @param request - Provider child-flow request.
 * @param source - Measured source-order container.
 * @returns Canonical child-flow root without View products.
 */
function createFlowRoot(
  request: QuireLayoutProviderChildFlowRequest,
  source: QuireLayoutContainer
): QuireChildFlowRoot {
  const placementRect = unionTrackRects(request.tracks.map((track) => track.rect));

  return {
    id: request.id,
    kind: "extension-container",
    range: request.source.range,
    placement: {
      parentId: request.id,
      rect: placementRect,
      contentRect: placementRect
    },
    localRect: source.rect,
    writingMode: "horizontal-tb",
    dependencySignature: request.dependencySignature
  };
}

/**
 * Converts one measured source child into consumer-neutral flow geometry.
 *
 * @param box - Measured source-order child box.
 * @returns Canonical source-flow item.
 */
function createFlowItem(box: QuireLayoutBox): QuireChildFlowItem {
  return {
    id: box.id,
    sourceId: box.id,
    range: box.range,
    localRect: box.rect,
    textFragments: box.textFragments
  };
}

/**
 * Projects a provider track into the fields owned by canonical child flow.
 *
 * @param track - Provider track carrying geometry and View ownership facts.
 * @returns Consumer-neutral visual track.
 */
function createGeometryTrack(
  track: QuireLayoutProviderFlowTrack
): QuireChildFlowTrack {
  return {
    id: track.id,
    rect: track.rect,
    coordinateSpace: track.coordinateSpace,
    ...(track.rootPlacement === undefined
      ? {}
      : { rootPlacement: track.rootPlacement }),
    ...(track.interactionClip === undefined
      ? {}
      : { interactionClip: track.interactionClip }),
    ...(track.pageIndex === undefined ? {} : { pageIndex: track.pageIndex }),
    ...(track.parentFragmentId === undefined
      ? {}
      : { parentFragmentId: track.parentFragmentId }),
    ...(track.continuationState === undefined
      ? {}
      : { continuationState: track.continuationState })
  };
}

/**
 * Computes the bounding rectangle of explicit visual tracks.
 *
 * @param rects - Track rectangles.
 * @returns Bounding rectangle, or a zero rectangle for no tracks.
 */
function unionTrackRects(
  rects: readonly QuireLayoutContainer["rect"][]
): QuireLayoutContainer["rect"] {
  if (rects.length === 0) {
    return { x: 0, y: 0, width: 0, height: 0 };
  }
  const left = Math.min(...rects.map((rect) => rect.x));
  const top = Math.min(...rects.map((rect) => rect.y));
  const right = Math.max(...rects.map((rect) => rect.x + rect.width));
  const bottom = Math.max(...rects.map((rect) => rect.y + rect.height));
  return { x: left, y: top, width: right - left, height: bottom - top };
}
