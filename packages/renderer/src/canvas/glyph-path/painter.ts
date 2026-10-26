import type {
  QuireGlyphRunCommand
} from "../../core/display-list";
import type {
  CanvasGlyphRunPaintContext,
  CanvasGlyphRunPainter
} from "../types";
import { applyGlyphPathOutline, hasCanvasGlyphPathApis } from "./path";
import { reportGlyphPathFallback, resolveGlyphPaths } from "./resolve";
import type { CanvasGlyphPathSource } from "./types";

/**
 * Creates a Canvas painter that fills renderer-provided glyph path outlines.
 *
 * @param source - Renderer-side glyph outline source.
 * @returns Glyph-run painter that can take over path-backed glyph drawing.
 */
export function createCanvasPathGlyphRunPainter(
  source: CanvasGlyphPathSource
): CanvasGlyphRunPainter {
  return new CanvasPathGlyphRunPainter(source);
}

/** Canvas glyph-run painter that fills renderer-provided glyph path outlines. */
class CanvasPathGlyphRunPainter implements CanvasGlyphRunPainter {
  private readonly source: CanvasGlyphPathSource;

  /**
   * Creates a glyph path painter.
   *
   * @param source - Renderer-side glyph outline source.
   */
  constructor(source: CanvasGlyphPathSource) {
    this.source = source;
  }

  /**
   * Paints one shaped glyph run with translated path outlines.
   *
   * @param command - Glyph-run command to paint.
   * @param context - Canvas 2D paint context.
   * @returns Whether every glyph outline was resolved and painted.
   */
  paintGlyphRun(
    command: QuireGlyphRunCommand,
    context: CanvasGlyphRunPaintContext
  ): boolean {
    if (command.glyphCoverage !== "complete") {
      reportGlyphPathFallback(context, command, {
        reason: "glyph-path-coverage-partial"
      });

      return false;
    }

    if (command.glyphs.length === 0) {
      reportGlyphPathFallback(context, command, {
        reason: "glyph-path-run-empty"
      });

      return false;
    }

    if (!hasCanvasGlyphPathApis(context.target)) {
      reportGlyphPathFallback(context, command, {
        reason: "glyph-path-target-unsupported"
      });

      return false;
    }

    const glyphPaths = resolveGlyphPaths(command, this.source, context);

    if (glyphPaths === null) {
      return false;
    }

    const mode = command.paintMode ?? "fill";
    if (mode === "fill" || mode === "fill-stroke") {
      context.target.fillStyle = command.fillStyle;
    }
    if (mode === "stroke" || mode === "fill-stroke") {
      context.target.strokeStyle = command.strokeStyle ?? command.fillStyle;
      context.target.lineWidth = command.lineWidth ?? 1;
    }
    context.target.beginPath();

    for (const glyphPath of glyphPaths) {
      applyGlyphPathOutline(
        context.target,
        glyphPath.outline,
        command.origin.x + glyphPath.glyph.x + glyphPath.glyph.xOffset,
        command.origin.y + glyphPath.glyph.y + glyphPath.glyph.yOffset
      );
    }

    if (mode === "fill" || mode === "fill-stroke") {
      context.target.fill();
    }
    if (mode === "stroke" || mode === "fill-stroke") {
      context.target.stroke?.();
    }

    return true;
  }
}
