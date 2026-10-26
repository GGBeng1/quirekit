import * as hb from "harfbuzzjs";
import type { CanvasGlyphPathOutline } from "@quirekit/renderer";
import type { QuireShapedTextRun } from "../text/types";
import { mapQuireGlyphPlacementsToShapedRun } from "./glyphs";
import {
  createHarfBuzzBuffer,
  resolveReportedClusterDirection,
  toHarfBuzzFeatures
} from "./harfbuzz-run";
import type {
  QuireGlyphPathFontLoader,
  QuireGlyphPathFontOptions,
  QuireLoadedGlyphPathFont,
  QuireLoadedShaperFont,
  QuireShapeRunOptions,
  QuireShaperFontSource,
  QuireTextShaperBackend
} from "./types";

/** Options for creating the HarfBuzz-backed text shaper. */
export interface HarfBuzzTextShaperBackendOptions {
  /** Human-readable backend name used by diagnostics. */
  readonly name?: string;
  /** Optional loader that attaches exact glyph outline support to loaded fonts. */
  readonly glyphPathFontLoader?: QuireGlyphPathFontLoader | undefined;
}

/** HarfBuzz-backed shaping backend. */
class HarfBuzzTextShaperBackend implements QuireTextShaperBackend {
  /** Human-readable backend name used by diagnostics. */
  readonly name: string;

  private readonly glyphPathFontLoader: QuireGlyphPathFontLoader | undefined;

  /**
   * Creates a HarfBuzz-backed shaping backend.
   *
   * @param options - Backend naming options.
   */
  constructor(options: HarfBuzzTextShaperBackendOptions = {}) {
    this.name = options.name ?? "harfbuzzjs";
    this.glyphPathFontLoader = options.glyphPathFontLoader;
  }

  /**
   * Loads one font source into HarfBuzz.
   *
   * @param source - Font bytes and CSS metadata.
   * @returns Loaded font instance for synchronous shaping.
   */
  async loadFont(source: QuireShaperFontSource): Promise<QuireLoadedShaperFont> {
    const glyphPathFont = await this.glyphPathFontLoader?.loadGlyphPathFont(source);

    return new HarfBuzzLoadedShaperFont(
      source,
      glyphPathFont ?? null
    );
  }
}

/** Loaded HarfBuzz font that can synchronously shape runs. */
class HarfBuzzLoadedShaperFont implements QuireLoadedShaperFont {
  /** Stable loaded font id. */
  readonly id: string;

  /** Original font source metadata. */
  readonly source: QuireShaperFontSource;

  /** HarfBuzz blob wrapping font bytes. */
  private readonly blob: hb.Blob;

  /** HarfBuzz face created from the source font. */
  private readonly face: hb.Face;

  /** HarfBuzz font instance reused for shaping runs. */
  private readonly font: hb.Font;

  /** Optional provider for renderer glyph outlines using the same font source. */
  private readonly glyphPathFont: QuireLoadedGlyphPathFont | null;

  /**
   * Creates a loaded HarfBuzz font.
   *
   * @param source - Font bytes and CSS metadata.
   * @param glyphPathFont - Optional paired glyph outline provider.
   */
  constructor(
    source: QuireShaperFontSource,
    glyphPathFont: QuireLoadedGlyphPathFont | null
  ) {
    this.id = source.id;
    this.source = source;
    this.blob = new hb.Blob(source.data.slice(0));
    this.face = new hb.Face(this.blob, source.faceIndex ?? 0);
    this.font = new hb.Font(this.face);
    // Shape in design units: HarfBuzz's integer scale cannot retain fractional CSS sizes.
    this.font.setScale(this.face.upem, this.face.upem);
    this.glyphPathFont = glyphPathFont;
  }

  /**
   * Checks whether this font can shape all characters in a text run.
   *
   * @param text - Text content to check.
   * @returns Whether HarfBuzz returned non-.notdef glyph ids for the run.
   */
  canShapeText(text: string): boolean {
    if (text.length === 0) {
      return true;
    }

    const buffer = createHarfBuzzBuffer({
      text,
      font: `${1}px ${this.source.family}`,
      size: 1
    });

    hb.shape(this.font, buffer, []);

    return buffer.getGlyphInfosAndPositions().every((glyph) => glyph.codepoint !== 0);
  }

  /**
   * Shapes one logical run through HarfBuzz.
   *
   * @param options - Run text, CSS font token, scale, and optional script data.
   * @returns Cluster-based shaped text run.
   */
  shapeRun(options: QuireShapeRunOptions): QuireShapedTextRun {
    const pixelsPerUnit = options.size / this.face.upem;
    const buffer = createHarfBuzzBuffer(options);
    hb.shape(this.font, buffer, toHarfBuzzFeatures(options.features));
    const extents = this.font.hExtents();
    const direction = resolveReportedClusterDirection(options.direction);
    const mappedOptions = {
      text: options.text,
      glyphs: buffer.getGlyphInfosAndPositions().map((glyph) => ({
        codepoint: glyph.codepoint,
        cluster: glyph.cluster,
        xAdvance: (glyph.xAdvance ?? this.font.glyphHAdvance(glyph.codepoint)) * pixelsPerUnit,
        yAdvance: (glyph.yAdvance ?? 0) * pixelsPerUnit,
        xOffset: (glyph.xOffset ?? 0) * pixelsPerUnit,
        yOffset: (glyph.yOffset ?? 0) * pixelsPerUnit,
        fontId: this.id,
        fontFamily: this.source.family
      })),
      ascent: extents.ascender * pixelsPerUnit,
      descent: Math.abs(extents.descender) * pixelsPerUnit
    };

    return mapQuireGlyphPlacementsToShapedRun(
      direction ? { ...mappedOptions, direction } : mappedOptions
    );
  }

  /**
   * Resolves a renderer glyph outline through the paired outline provider.
   *
   * @param glyphId - HarfBuzz glyph id.
   * @param options - CSS font and resolved size for this paint request.
   * @returns Glyph outline, or nullish when no outline provider is attached.
   */
  getGlyphPath(
    glyphId: number,
    options: QuireGlyphPathFontOptions
  ): CanvasGlyphPathOutline | null {
    return this.glyphPathFont?.getGlyphPath(glyphId, options) ?? null;
  }

  /**
   * Releases paired outline resources.
   */
  destroy(): void {
    this.glyphPathFont?.destroy?.();
  }
}

/**
 * Creates a HarfBuzz-backed text shaping backend.
 *
 * @param options - Backend naming options.
 * @returns Text shaper backend that can load OpenType-compatible font bytes.
 */
export function createHarfBuzzTextShaperBackend(
  options: HarfBuzzTextShaperBackendOptions = {}
): QuireTextShaperBackend {
  return new HarfBuzzTextShaperBackend(options);
}
