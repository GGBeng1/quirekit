import {
  create,
  type Font,
  type FontCollection
} from "fontkit";
import type { CanvasGlyphPathOutline } from "@quirekit/renderer";
import type {
  QuireGlyphPathFontLoader,
  QuireGlyphPathFontOptions,
  QuireLoadedGlyphPathFont,
  QuireShaperFontSource
} from "../types";
import { convertFontKitPathCommands } from "./convert";
import type { FontKitGlyphPathFontLoaderOptions } from "./types";

/** Loaded fontkit outline provider for one font source. */
class FontKitLoadedGlyphPathFont implements QuireLoadedGlyphPathFont {
  private readonly font: Font;
  private readonly flipY: boolean;
  private readonly cache = new Map<string, CanvasGlyphPathOutline | null>();

  /**
   * Creates a loaded fontkit outline provider.
   *
   * @param font - Fontkit font object.
   * @param options - Outline coordinate options.
   */
  constructor(font: Font, options: Required<FontKitGlyphPathFontLoaderOptions>) {
    this.font = font;
    this.flipY = options.flipY;
  }

  /**
   * Resolves and scales one glyph outline.
   *
   * @param glyphId - Glyph id in the fontkit font.
   * @param options - CSS font and resolved pixel size for this paint request.
   * @returns Scaled glyph path outline, or null when fontkit cannot resolve it.
   */
  getGlyphPath(
    glyphId: number,
    options: QuireGlyphPathFontOptions
  ): CanvasGlyphPathOutline | null {
    const cacheKey = `${glyphId}:${options.size}`;

    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey) ?? null;
    }

    const outline = this.resolveGlyphPath(glyphId, options.size);
    this.cache.set(cacheKey, outline);

    return outline;
  }

  /**
   * Resolves a glyph path from fontkit and converts it to renderer segments.
   *
   * @param glyphId - Glyph id in the fontkit font.
   * @param size - CSS pixel font size.
   * @returns Scaled glyph path outline, or null when the glyph cannot be read.
   */
  private resolveGlyphPath(
    glyphId: number,
    size: number
  ): CanvasGlyphPathOutline | null {
    try {
      const glyph = this.font.getGlyph(glyphId);
      const scale = size / this.font.unitsPerEm;
      const segments = convertFontKitPathCommands(
        glyph.path.commands,
        scale,
        this.flipY
      );

      return { segments };
    } catch {
      return null;
    }
  }
}

/** Fontkit-backed glyph outline loader. */
class FontKitGlyphPathFontLoader implements QuireGlyphPathFontLoader {
  private readonly options: Required<FontKitGlyphPathFontLoaderOptions>;

  /**
   * Creates a fontkit glyph outline loader.
   *
   * @param options - Outline coordinate options.
   */
  constructor(options: FontKitGlyphPathFontLoaderOptions = {}) {
    this.options = {
      flipY: options.flipY ?? true
    };
  }

  /**
   * Loads one font source into fontkit for outline lookup.
   *
   * @param source - Font source already normalized by the font service.
   * @returns Loaded glyph outline provider.
   */
  loadGlyphPathFont(source: QuireShaperFontSource): QuireLoadedGlyphPathFont {
    const font = resolveFontKitFont(create(createFontKitDataView(source.data)), source);

    return new FontKitLoadedGlyphPathFont(font, this.options);
  }
}

/**
 * Creates a fontkit-backed glyph outline loader.
 *
 * @param options - Outline coordinate options.
 * @returns Loader that can attach outline support to loaded shaper fonts.
 */
export function createFontKitGlyphPathFontLoader(
  options: FontKitGlyphPathFontLoaderOptions = {}
): QuireGlyphPathFontLoader {
  return new FontKitGlyphPathFontLoader(options);
}

/**
 * Creates the byte view accepted by fontkit in browser and Node runtimes.
 *
 * `@types/fontkit` currently narrows `create()` to Node `Buffer`, but fontkit's
 * runtime parser accepts `Uint8Array` as well. Keeping the runtime value as a
 * `Uint8Array` avoids relying on a browser Buffer polyfill.
 *
 * @param data - Normalized font bytes from the font service.
 * @returns Fontkit parser input.
 */
function createFontKitDataView(data: ArrayBuffer): Parameters<typeof create>[0] {
  return new Uint8Array(data) as unknown as Parameters<typeof create>[0];
}

/**
 * Resolves one font from a fontkit font or collection.
 *
 * @param value - Fontkit font or collection returned by `create`.
 * @param source - Font source carrying the optional face index.
 * @returns Concrete fontkit font.
 */
function resolveFontKitFont(
  value: Font | FontCollection,
  source: QuireShaperFontSource
): Font {
  if (value.type !== "TTC" && value.type !== "DFont") {
    return value as Font;
  }

  const font = value.fonts[source.faceIndex ?? 0];

  if (font === undefined) {
    throw new Error(`Font source ${source.id} has no face ${source.faceIndex ?? 0}`);
  }

  return font;
}
