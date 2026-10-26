import { cloneQuireTextFragmentWithLazyCaretStops } from "../text";
import type { QuireRect } from "@quirekit/renderer";
import { intersectQuireRects } from "@quirekit/renderer";
import {
  rectIntersectsQuireChildFlowBand,
  translateQuireChildFlowRect
} from "./geometry";
import {
  createQuireChildFlowContinuation,
  createQuireChildFlowResult
} from "./result";
import type {
  LayoutQuireChildFlowOptions,
  QuireChildFlowFragment,
  QuireChildFlowItem,
  QuireChildFlowLayout,
  QuireChildFlowResult
} from "./types";

/**
 * Places measured source-order items through declared visual tracks.
 *
 * The algorithm owns only recursive geometry and continuation progress. It
 * deliberately does not know about editor roots, pointer policy, query
 * products, display commands, retained regions, or mounted pages.
 *
 * @param options - Root, measured items, visual tracks, and source band.
 * @returns Canonical child-flow results and continuation progress.
 */
export function layoutQuireChildFlow(
  options: LayoutQuireChildFlowOptions
): QuireChildFlowLayout {
  const results: QuireChildFlowResult[] = [];
  let cursor = options.sourceBand.top;

  for (const track of options.tracks) {
    if (cursor >= options.sourceBand.bottom) {
      break;
    }

    const capacity = Math.max(0, track.rect.height);
    if (capacity === 0) {
      continue;
    }

    // A result consumes one contiguous source band. The identity includes that
    // band so repeated roots and page-local visual tracks cannot collide.
    const acceptedBand = {
      top: cursor,
      bottom: Math.min(options.sourceBand.bottom, cursor + capacity)
    };
    const resultId = [
      options.root.id,
      track.id,
      `source-flow:${acceptedBand.top}-${acceptedBand.bottom}`
    ].join(":");
    const localToResult = {
      x: track.rect.x - options.root.localRect.x,
      y: track.rect.y - acceptedBand.top
    };
    const interactionClip = track.interactionClip ?? track.rect;
    const root = {
      ...options.root,
      placement: track.rootPlacement ?? {
        parentId: track.id,
        rect: track.rect,
        contentRect: track.rect,
        clipRect: interactionClip
      }
    };
    const items = options.items.filter((item) =>
      rectIntersectsQuireChildFlowBand(
        item.localRect,
        acceptedBand.top,
        acceptedBand.bottom
      )
    );

    results.push(createQuireChildFlowResult({
      id: resultId,
      trackId: track.id,
      root,
      acceptedBand,
      fragments: items.map((item) =>
        createTrackFragment(item, interactionClip, localToResult)
      ),
      localToResult,
      coordinateSpace: track.coordinateSpace,
      contentClip: track.rect,
      interactionClip,
      continuation: createQuireChildFlowContinuation({
        root,
        acceptedBand,
        previousResultId: resultId,
        sourceFlowBottom: options.sourceBand.bottom,
        ...(track.pageIndex === undefined ? {} : { pageIndex: track.pageIndex }),
        parentFragmentId: track.parentFragmentId ?? track.id,
        adapterState: track.continuationState ?? { flowTrackId: track.id }
      }),
      dependencySignature: options.root.dependencySignature
    }));
    cursor = acceptedBand.bottom;
  }

  return {
    results,
    nextSourceFlowY: cursor,
    complete: cursor >= options.sourceBand.bottom
  };
}

/**
 * Creates one result-space fragment for a visual track.
 *
 * @param item - Source-flow item.
 * @param clip - Result-space clip rectangle.
 * @param transform - Root-local to result-space translation.
 * @returns Canonical child fragment.
 */
function createTrackFragment(
  item: QuireChildFlowItem,
  clip: QuireRect,
  transform: { readonly x: number; readonly y: number }
): QuireChildFlowFragment {
  const translatedRect = translateQuireChildFlowRect(item.localRect, transform);

  return {
    id: item.id,
    sourceId: item.sourceId,
    range: item.range,
    rect: intersectQuireRects(translatedRect, clip) ?? translatedRect,
    localRect: item.localRect,
    clipRect: clip,
    ...(item.textFragments === undefined
      ? {}
      : {
          textFragments: item.textFragments.map((fragment) =>
            cloneQuireTextFragmentWithLazyCaretStops({
              source: fragment,
              id: fragment.id,
              range: fragment.range,
              rect: translateQuireChildFlowRect(fragment.rect, transform),
              baseline: fragment.baseline + transform.y
            })
          )
        })
  };
}
