import type {
  QuireGlyphRunCommand,
  QuireGlyphRunGlyphPlacement
} from "../../core/display-list";
import type {
  CanvasGlyphRunFallbackReason,
  CanvasGlyphRunPaintContext
} from "../types";
import type {
  CanvasGlyphPathRequest,
  CanvasGlyphPathResolution,
  CanvasGlyphPathSource,
  ResolvedCanvasGlyphPath
} from "./types";

/**
 * Resolves every glyph outline for a shaped glyph run.
 *
 * @param command - Glyph-run command containing fallback font and placements.
 * @param source - Renderer-side outline source.
 * @param context - Canvas glyph-run paint context.
 * @returns Resolved outlines, or null when any glyph outline is unavailable.
 */
export function resolveGlyphPaths(
  command: QuireGlyphRunCommand,
  source: CanvasGlyphPathSource,
  context: CanvasGlyphRunPaintContext
): readonly ResolvedCanvasGlyphPath[] | null {
  const glyphPaths: ResolvedCanvasGlyphPath[] = [];

  for (const glyph of command.glyphs) {
    if (glyph.fontId === undefined) {
      reportGlyphPathFallback(context, command, {
        glyph,
        reason: "glyph-path-font-id-missing"
      });

      return null;
    }

    const resolution = resolveGlyphPath(source, createGlyphPathRequest(command, glyph));

    if (resolution.status === "fallback") {
      reportGlyphPathFallback(context, command, {
        glyph,
        loadedFamily: resolution.loadedFamily,
        reason: resolution.reason,
        requestedFamily: resolution.requestedFamily
      });

      return null;
    }

    glyphPaths.push({ glyph, outline: resolution.outline });
  }

  return glyphPaths;
}

/**
 * Reports an exact glyph-path fallback when the caller supplied a diagnostic sink.
 *
 * @param context - Canvas glyph-run paint context.
 * @param command - Glyph-run command that fell back.
 * @param fallback - Specific route failure metadata.
 * @returns Nothing.
 */
export function reportGlyphPathFallback(
  context: CanvasGlyphRunPaintContext,
  command: QuireGlyphRunCommand,
  fallback: {
    readonly reason: CanvasGlyphRunFallbackReason;
    readonly glyph?: QuireGlyphRunGlyphPlacement;
    readonly requestedFamily?: string | undefined;
    readonly loadedFamily?: string | undefined;
  }
): void {
  context.reportGlyphRunFallback?.({
    commandId: command.id,
    font: command.font,
    route: "glyph-path",
    text: command.text,
    ...(fallback.glyph?.fontFamily === undefined
      ? {}
      : { fontFamily: fallback.glyph.fontFamily }),
    ...(fallback.glyph?.fontId === undefined ? {} : { fontId: fallback.glyph.fontId }),
    ...(fallback.glyph === undefined ? {} : { glyphId: fallback.glyph.glyphId }),
    ...(fallback.loadedFamily === undefined ? {} : { loadedFamily: fallback.loadedFamily }),
    reason: fallback.reason,
    ...(fallback.requestedFamily === undefined
      ? {}
      : { requestedFamily: fallback.requestedFamily })
  });
}

/**
 * Resolves one glyph path through a source's richest available API.
 *
 * @param source - Renderer-side outline source.
 * @param request - Glyph identity and font identity to resolve.
 * @returns Resolved outline or fallback reason.
 */
function resolveGlyphPath(
  source: CanvasGlyphPathSource,
  request: CanvasGlyphPathRequest
): CanvasGlyphPathResolution {
  if (source.resolveGlyphPath !== undefined) {
    return source.resolveGlyphPath(request);
  }

  const outline = source.getGlyphPath(request);

  if (outline == null) {
    return {
      request,
      reason: "glyph-path-outline-missing",
      status: "fallback"
    };
  }

  return {
    outline,
    request,
    status: "resolved"
  };
}

/**
 * Creates an outline source request from a glyph placement.
 *
 * @param command - Glyph-run command that owns the placement.
 * @param glyph - Glyph placement to convert.
 * @returns Glyph path source request.
 */
function createGlyphPathRequest(
  command: QuireGlyphRunCommand,
  glyph: QuireGlyphRunGlyphPlacement
): CanvasGlyphPathRequest {
  return {
    glyphId: glyph.glyphId,
    font: command.font,
    ...(glyph.fontId === undefined ? {} : { fontId: glyph.fontId }),
    ...(glyph.fontFamily === undefined ? {} : { fontFamily: glyph.fontFamily })
  };
}
