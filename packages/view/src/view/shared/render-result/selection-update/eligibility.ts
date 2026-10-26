import { canReuseQuireViewEngineLayoutSnapshot } from "@quirekit/view-engine";
import type { CanReuseMountedSelectionOverlayRenderResultOptions } from "./types";
import { hasMountedSelectionPaintAuthority } from "./paint-authority";

/**
 * Reports whether a cached render result can update only selection/caret overlay paint.
 *
 * @param options - Previous render result, current state, and materialization policy.
 * @returns Whether persistent content can be reused for the selection update.
 */
export function canReuseMountedSelectionOverlayRenderResult(
  options: CanReuseMountedSelectionOverlayRenderResultOptions
): boolean {
  const previous = options.previousRenderResult;

  if (options.state.doc !== previous.layoutSnapshot.state.doc) {
    return false;
  }

  // Empty output does not prove selection/meta independence. Inspect the live
  // mounted source without executing providers; old paint must also be cleared
  // after provider removal. Typed dependency proof is a separate admission gate.
  if (
    options.decorationSourceView === undefined
    || options.decorationSourceView.someProp(
      "decorations", (provider) => typeof provider === "function"
    ) === true
    || previous.decorationLane.interactionTargets.length > 0
    || previous.decorationLane.backgrounds.length > 0
    || previous.decorationLane.textStyles.length > 0
    || previous.decorationLane.nodes.length > 0
    || (previous.decorationLane.pointMarkers?.length ?? 0) > 0
    || previous.decorationLane.widgets.length > 0
  ) {
    return false;
  }

  const frameOptions = typeof options.frameOptions === "function"
    ? options.frameOptions() : options.frameOptions;
  return frameOptions !== undefined
    && hasMountedSelectionPaintAuthority(previous, frameOptions)
    && canReuseQuireViewEngineLayoutSnapshot({
      snapshot: previous.layoutSnapshot,
      state: options.state,
      options: frameOptions,
      requireSelectionIndependentGeometry: true
    });
}
