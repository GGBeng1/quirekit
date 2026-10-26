import { paintQuireDisplayCommand } from "../core/paint";
import { createCanvas2DDrawSurface } from "./surface";
import type { Canvas2DRenderOptions } from "./types";

/**
 * Renders a display list to a Canvas 2D-like target.
 *
 * @param options - Display list and render target to use for painting.
 */
export function renderCanvasDisplayList(options: Canvas2DRenderOptions): void {
  const { bounds, commands } = options.displayList;

  options.target.clearRect(bounds.x, bounds.y, bounds.width, bounds.height);
  const surface = createCanvas2DDrawSurface(options.target, {
    ...(options.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: options.glyphRunPainter }),
    ...(options.onGlyphRunFallback === undefined
      ? {}
      : { onGlyphRunFallback: options.onGlyphRunFallback })
  });

  for (const command of commands) {
    paintQuireDisplayCommand(surface, command);
  }
}
