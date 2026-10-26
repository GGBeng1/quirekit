import type {
  CanvasGlyphPathOutline,
  CanvasGlyphPathRequest,
  CanvasGlyphPathResolution,
  CanvasGlyphPathSource,
  CanvasGlyphRunFallbackReason
} from "@quirekit/renderer";
import type { QuireLoadedShaperFont } from "../types";
import { resolveQuireFontPixelSize } from "../font-size";
import { normalizeQuireFontFamily } from "../font-resolver/request";

/** Renderer glyph path source backed by loaded font-service fonts. */
class QuireFontServiceGlyphPathSource implements CanvasGlyphPathSource {
  private readonly fontsById: ReadonlyMap<string, QuireLoadedShaperFont>;

  private readonly cache = new Map<string, CanvasGlyphPathOutline | null>();

  /**
   * Creates a glyph path source from loaded shaper fonts.
   *
   * @param fonts - Loaded fonts managed by the font service.
   */
  constructor(fonts: readonly QuireLoadedShaperFont[]) {
    this.fontsById = new Map(fonts.map((font) => [font.id, font]));
  }

  /**
   * Resolves a glyph outline from the loaded font matching the request.
   *
   * @param request - Glyph id plus serializable font identity.
   * @returns Glyph path outline, or null when the font cannot provide it.
   */
  getGlyphPath(request: CanvasGlyphPathRequest): CanvasGlyphPathOutline | null {
    const resolution = this.resolveGlyphPath(request);

    return resolution.status === "resolved" ? resolution.outline : null;
  }

  /**
   * Resolves a glyph outline with a renderer-readable fallback reason.
   *
   * @param request - Glyph id plus serializable font identity.
   * @returns Resolved outline or specific fallback reason.
   */
  resolveGlyphPath(request: CanvasGlyphPathRequest): CanvasGlyphPathResolution {
    const fontResolution = resolveQuireGlyphPathFont(request, this.fontsById);

    if (fontResolution.status === "fallback") {
      return {
        ...fontResolution,
        request
      };
    }

    const font = fontResolution.font;

    if (font.getGlyphPath === undefined) {
      return {
        reason: "glyph-path-outline-provider-missing",
        request,
        status: "fallback"
      };
    }

    const fallbackFont = `16px ${font.source.family}`;
    const requestFont = request.font ?? fallbackFont;
    const cacheKey = createQuireGlyphPathCacheKey(font.id, request.glyphId, requestFont);

    if (this.cache.has(cacheKey)) {
      const outline = this.cache.get(cacheKey) ?? null;

      return outline === null
        ? {
            reason: "glyph-path-outline-missing",
            request,
            status: "fallback"
          }
        : {
            outline,
            request,
            status: "resolved"
          };
    }

    const outline = font.getGlyphPath(request.glyphId, {
      font: requestFont,
      size: resolveQuireFontPixelSize(requestFont)
    }) ?? null;

    this.cache.set(cacheKey, outline);

    return outline === null
      ? {
          reason: "glyph-path-outline-missing",
          request,
          status: "fallback"
        }
      : {
          outline,
          request,
          status: "resolved"
        };
  }
}

/**
 * Creates a renderer glyph path source backed by loaded font-service fonts.
 *
 * @param fonts - Loaded fonts managed by the font service.
 * @returns Glyph path source that resolves outlines by `fontId + glyphId`.
 */
export function createQuireFontServiceGlyphPathSource(
  fonts: readonly QuireLoadedShaperFont[]
): CanvasGlyphPathSource {
  return new QuireFontServiceGlyphPathSource(fonts);
}

/**
 * Finds the loaded font that should own one glyph path request.
 *
 * @param request - Glyph path request from the renderer painter.
 * @param fontsById - Loaded fonts indexed by stable id.
 * @returns Matching loaded font, or null when no safe match exists.
 */
function resolveQuireGlyphPathFont(
  request: CanvasGlyphPathRequest,
  fontsById: ReadonlyMap<string, QuireLoadedShaperFont>
): QuireGlyphPathFontResolution {
  if (request.fontId === undefined) {
    return {
      reason: "glyph-path-font-id-missing",
      status: "fallback"
    };
  }

  const font = fontsById.get(request.fontId);

  if (font === undefined) {
    return {
      reason: "glyph-path-font-not-loaded",
      status: "fallback"
    };
  }

  if (
    request.fontFamily !== undefined
    && !doesQuireGlyphPathFontFamilyMatch(font, request.fontFamily)
  ) {
    return {
      loadedFamily: font.source.family,
      reason: "glyph-path-font-family-mismatch",
      requestedFamily: request.fontFamily,
      status: "fallback"
    };
  }

  return {
    font,
    status: "resolved"
  };
}

/** Resolved or rejected loaded font for one glyph path request. */
type QuireGlyphPathFontResolution =
  | {
      /** Resolution status discriminator. */
      readonly status: "resolved";
      /** Loaded font that owns the requested glyph. */
      readonly font: QuireLoadedShaperFont;
    }
  | {
      /** Resolution status discriminator. */
      readonly status: "fallback";
      /** Specific reason the font could not safely own the glyph path. */
      readonly reason: CanvasGlyphRunFallbackReason;
      /** Requested CSS family that failed source matching, when known. */
      readonly requestedFamily?: string;
      /** Loaded source family that was rejected, when known. */
      readonly loadedFamily?: string;
    };

/**
 * Checks whether a renderer glyph request belongs to a loaded font family.
 *
 * @param font - Loaded font resolved by stable id.
 * @param requestedFamily - CSS family name carried by the glyph request.
 * @returns Whether the family names match after CSS quote/case normalization.
 */
function doesQuireGlyphPathFontFamilyMatch(
  font: QuireLoadedShaperFont,
  requestedFamily: string
): boolean {
  return (
    normalizeQuireFontFamily(font.source.family)
    === normalizeQuireFontFamily(requestedFamily)
  );
}

/**
 * Creates a stable per-source glyph path cache key.
 *
 * @param fontId - Loaded font id that owns the glyph.
 * @param glyphId - Glyph id inside the loaded font.
 * @param requestFont - CSS font token used to resolve the glyph size.
 * @returns Cache key for one scaled glyph outline.
 */
function createQuireGlyphPathCacheKey(
  fontId: string,
  glyphId: number,
  requestFont: string
): string {
  return `${fontId}:${glyphId}:${requestFont}`;
}
