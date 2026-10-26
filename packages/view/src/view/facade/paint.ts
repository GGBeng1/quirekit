import {
  renderCanvasDisplayList,
  type QuireDisplayList
} from "@quirekit/renderer";
import type {
  QuireViewRenderOptions,
  QuireViewRenderResult,
  QuireViewSelectionUpdateOptions
} from "../types";

/**
 * Paints a render result to either one composite target or split content/overlay targets.
 *
 * @param renderResult - Render artifacts to paint.
 * @param options - Render options containing target information.
 */
export function renderQuireViewResult(
  renderResult: QuireViewRenderResult,
  options: QuireViewRenderOptions
): void {
  const paintBounds = resolveQuireViewPaintBounds(options);

  if (options.overlayTarget) {
    renderCanvasDisplayList({
      displayList: withQuireDisplayListBounds(
        renderResult.contentDisplayList,
        paintBounds
      ),
      target: options.target,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    });
    renderCanvasDisplayList({
      displayList: withQuireDisplayListBounds(
        renderResult.overlayDisplayList,
        paintBounds
      ),
      target: options.overlayTarget,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    });
    return;
  }

  renderCanvasDisplayList({
    displayList: withQuireDisplayListBounds(renderResult.displayList, paintBounds),
    target: options.target,
    ...(options.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: options.glyphRunPainter })
  });
}

/**
 * Paints a selection update through the safest target strategy available.
 *
 * @param renderResult - Updated render artifacts to paint.
 * @param options - Selection update render options.
 */
export function renderQuireViewSelectionUpdate(
  renderResult: QuireViewRenderResult,
  options: QuireViewSelectionUpdateOptions
): void {
  const paintBounds = resolveQuireViewPaintBounds(options);

  if (options.overlayTarget) {
    renderCanvasDisplayList({
      displayList: withQuireDisplayListBounds(
        renderResult.overlayDisplayList,
        paintBounds
      ),
      target: options.overlayTarget,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    });
    return;
  }

  renderCanvasDisplayList({
    displayList: withQuireDisplayListBounds(renderResult.displayList, paintBounds),
    target: options.target,
    ...(options.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: options.glyphRunPainter })
  });
}

/**
 * Resolves the clear bounds used for a canvas paint pass.
 *
 * @param options - Render options containing viewport and optional paint bounds.
 * @returns Paint bounds used to clear render targets.
 */
function resolveQuireViewPaintBounds(
  options: QuireViewRenderOptions
): QuireDisplayList["bounds"] {
  return options.paintBounds ?? options.viewportRect;
}

/**
 * Returns a display list that clears the current viewport before painting.
 *
 * @param displayList - Display list whose commands should be preserved.
 * @param bounds - Viewport bounds to use for target clearing.
 * @returns Display list with viewport-scoped clear bounds.
 */
function withQuireDisplayListBounds(
  displayList: QuireDisplayList,
  bounds: QuireDisplayList["bounds"]
): QuireDisplayList {
  return {
    ...displayList,
    bounds
  };
}
