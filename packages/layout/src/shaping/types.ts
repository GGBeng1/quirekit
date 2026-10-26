import type {
  CanvasGlyphPathOutline,
  QuireShaperFontSource
} from "@quirekit/renderer";
import type {
  QuireShapedTextRun,
  QuireTextClusterDirection
} from "../text/types";

/** Direction option accepted by a text shaping backend. */
export type QuireTextShapeDirection = QuireTextClusterDirection | "auto";

/** OpenType feature override for one shaped run. */
export interface QuireOpenTypeFeature {
  /** Four-character OpenType feature tag, such as `liga` or `kern`. */
  readonly tag: string;
  /** Feature value. Boolean values are converted by concrete backends. */
  readonly value: boolean | number;
  /** Optional source offset where the feature starts. */
  readonly start?: number;
  /** Optional source offset where the feature ends. */
  readonly end?: number;
}

export type { QuireShaperFontSource };

/** Options for shaping one logical text run. */
export interface QuireShapeRunOptions {
  /** Text content to shape. */
  readonly text: string;
  /** CSS font shorthand requested by the layout run. */
  readonly font: string;
  /** CSS pixel font size used to scale backend units. */
  readonly size: number;
  /** Direction of this already segmented run. */
  readonly direction?: QuireTextShapeDirection;
  /** OpenType script tag when known, such as `latn` or `arab`. */
  readonly script?: string;
  /** BCP 47 language tag when known, such as `en` or `zh-CN`. */
  readonly language?: string;
  /** OpenType feature overrides applied to this run. */
  readonly features?: readonly QuireOpenTypeFeature[];
}

/** Options for resolving one glyph outline from a loaded font. */
export interface QuireGlyphPathFontOptions {
  /** CSS font shorthand attached to the glyph-run command. */
  readonly font: string;
  /** CSS pixel font size parsed from the glyph-run font shorthand. */
  readonly size: number;
}

/** Loaded glyph outline provider attached to a loaded shaper font. */
export interface QuireLoadedGlyphPathFont {
  /**
   * Resolves a glyph outline in CSS-pixel glyph-local coordinates.
   *
   * @param glyphId - Backend glyph id shaped by the paired shaper font.
   * @param options - CSS font and resolved pixel size for this paint request.
   * @returns Glyph path outline, or nullish when the glyph has no outline.
   */
  getGlyphPath(
    glyphId: number,
    options: QuireGlyphPathFontOptions
  ): CanvasGlyphPathOutline | null | undefined;
  /**
   * Releases optional outline resources.
   */
  destroy?(): void;
}

/** Loader that attaches glyph outline support to a font source. */
export interface QuireGlyphPathFontLoader {
  /**
   * Loads an optional glyph outline provider for one font source.
   *
   * @param source - Font source already normalized by the font service.
   * @returns Loaded glyph outline provider, or nullish when unsupported.
   */
  loadGlyphPathFont(
    source: QuireShaperFontSource
  ): QuireLoadedGlyphPathFont | null | undefined | Promise<QuireLoadedGlyphPathFont | null | undefined>;
}

/** Loaded font instance that can synchronously shape layout runs. */
export interface QuireLoadedShaperFont {
  /** Stable loaded font id. */
  readonly id: string;
  /** Original font source metadata. */
  readonly source: QuireShaperFontSource;
  /**
   * Returns whether this font can shape all characters in a text run.
   *
   * @param text - Text content to check.
   * @returns Whether the font covers every character in the text.
   */
  canShapeText?(text: string): boolean;
  /**
   * Shapes one logical run through this loaded font.
   *
   * @param options - Run text, CSS font token, scale, and optional script data.
   * @returns Cluster-based shaped text run.
   */
  shapeRun(options: QuireShapeRunOptions): QuireShapedTextRun;
  /**
   * Resolves an optional glyph outline for exact renderer path painting.
   *
   * @param glyphId - Backend glyph id shaped by this loaded font.
   * @param options - CSS font and resolved pixel size for this paint request.
   * @returns Glyph path outline, or nullish when the font cannot provide one.
   */
  getGlyphPath?(
    glyphId: number,
    options: QuireGlyphPathFontOptions
  ): CanvasGlyphPathOutline | null | undefined;
  /**
   * Releases backend resources owned by this loaded font.
   */
  destroy?(): void;
}

/** Backend capable of loading font bytes for later synchronous shaping. */
export interface QuireTextShaperBackend {
  /** Human-readable backend name used by diagnostics. */
  readonly name: string;
  /**
   * Loads one font source into the backend.
   *
   * @param source - Font bytes and CSS metadata.
   * @returns Loaded font instance for synchronous shaping.
   */
  loadFont(source: QuireShaperFontSource): Promise<QuireLoadedShaperFont>;
  /**
   * Releases backend-wide resources.
   *
   * @returns Optional promise when cleanup is asynchronous.
   */
  destroy?(): void | Promise<void>;
}
