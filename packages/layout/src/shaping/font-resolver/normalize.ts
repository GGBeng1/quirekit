import type {
  QuireShapedGlyphPlacement,
  QuireShapedTextCluster,
  QuireShapedTextRun,
  QuireTextMeasurer
} from "../../text/types";

/** Options for visual-width normalization. */
export interface QuireNormalizeShapedRunWidthOptions {
  /** Shaped run whose cluster advances should be normalized. */
  readonly shaped: QuireShapedTextRun;
  /** Width reported by the renderer that will actually paint the text. */
  readonly visualWidth: number;
}

/** Options for aligning resolver output to fallback visual measurement. */
export interface QuireNormalizeResolvedShapeToVisualWidthOptions {
  /** Shaped run produced by the font resolver. */
  readonly shaped: QuireShapedTextRun;
  /** Source text that was shaped. */
  readonly text: string;
  /** CSS font shorthand used for measurement. */
  readonly font: string;
  /** Whether normalization should run. */
  readonly enabled?: boolean | undefined;
  /** Fallback measurer that represents the renderer's visual width. */
  readonly fallbackMeasurer?: QuireTextMeasurer | undefined;
}

/**
 * Aligns shaped geometry to the renderer visual width when configured.
 *
 * @param options - Shaped run, source text, font, and fallback measurer.
 * @returns Original or normalized shaped run.
 */
export function normalizeResolvedShapeToVisualWidth(
  options: QuireNormalizeResolvedShapeToVisualWidthOptions
): QuireShapedTextRun {
  if (!options.enabled || !options.fallbackMeasurer) {
    return options.shaped;
  }

  return normalizeQuireShapedRunWidth({
    shaped: options.shaped,
    visualWidth: options.fallbackMeasurer.measureText(options.text, options.font).width
  });
}

/**
 * Normalizes shaped cluster positions to a renderer-reported visual width.
 *
 * @param options - Shaped run and visual width to align to.
 * @returns A shaped run whose cluster geometry ends at the visual width.
 */
export function normalizeQuireShapedRunWidth(
  options: QuireNormalizeShapedRunWidthOptions
): QuireShapedTextRun {
  if (
    options.shaped.width <= 0
    || options.visualWidth <= 0
    || options.shaped.width === options.visualWidth
  ) {
    return options.shaped;
  }

  const scale = options.visualWidth / options.shaped.width;

  return {
    clusters: options.shaped.clusters.map((cluster) => scaleQuireTextCluster(cluster, scale)),
    width: options.visualWidth,
    ascent: options.shaped.ascent,
    descent: options.shaped.descent,
    ...(options.shaped.glyphCoverage === undefined
      ? {}
      : { glyphCoverage: options.shaped.glyphCoverage }),
    ...(options.shaped.glyphs
      ? { glyphs: options.shaped.glyphs.map((glyph) => scaleQuireGlyphPlacement(glyph, scale)) }
      : {})
  };
}

/**
 * Scales one text cluster by a visual-width normalization factor.
 *
 * @param cluster - Cluster to scale.
 * @param scale - Width normalization factor.
 * @returns Scaled text cluster.
 */
function scaleQuireTextCluster(
  cluster: QuireShapedTextCluster,
  scale: number
): QuireShapedTextCluster {
  return {
    ...cluster,
    x: cluster.x * scale,
    advance: cluster.advance * scale
  };
}

/**
 * Scales one glyph placement by a visual-width normalization factor.
 *
 * @param glyph - Glyph placement to scale.
 * @param scale - Width normalization factor.
 * @returns Scaled glyph placement.
 */
function scaleQuireGlyphPlacement(
  glyph: QuireShapedGlyphPlacement,
  scale: number
): QuireShapedGlyphPlacement {
  return {
    ...glyph,
    x: glyph.x * scale,
    xAdvance: glyph.xAdvance * scale,
    xOffset: glyph.xOffset * scale
  };
}
