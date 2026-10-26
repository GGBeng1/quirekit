import type {
  QuireShapedGlyphPlacement,
  QuireShapedTextRun,
  QuireShapedTextCluster
} from "../../text/types";

/** Options for appending one shaped run to combined resolver output. */
export interface QuireAppendResolvedShapeOptions {
  /** Cluster output receiving mapped clusters. */
  readonly clusters: QuireShapedTextCluster[];
  /** Optional glyph placement output receiving mapped glyphs. */
  readonly glyphs?: QuireShapedGlyphPlacement[];
  /** Shaped run to append. */
  readonly shaped: QuireShapedTextRun;
  /** Source offset of the shaped run in the original text. */
  readonly sourceFrom: number;
  /** Current accumulated width before appending. */
  readonly width: number;
  /** Current maximum ascent before appending. */
  readonly ascent: number;
  /** Current maximum descent before appending. */
  readonly descent: number;
}

/** Metrics returned after appending one shaped run. */
export interface QuireAppendResolvedShapeResult {
  /** Updated accumulated width. */
  readonly width: number;
  /** Updated maximum ascent. */
  readonly ascent: number;
  /** Updated maximum descent. */
  readonly descent: number;
}

/**
 * Appends one shaped run to the combined output.
 *
 * @param options - Current output state and shaped run to append.
 * @returns Updated output metrics.
 */
export function appendQuireResolvedShape(
  options: QuireAppendResolvedShapeOptions
): QuireAppendResolvedShapeResult {
  options.clusters.push(...options.shaped.clusters.map((cluster) => ({
    ...cluster,
    from: options.sourceFrom + cluster.from,
    to: options.sourceFrom + cluster.to,
    x: options.width + cluster.x
  })));

  options.glyphs?.push(...(options.shaped.glyphs ?? []).map((glyph) => ({
    ...glyph,
    sourceCluster: options.sourceFrom + glyph.sourceCluster,
    x: options.width + glyph.x
  })));

  return {
    width: options.width + options.shaped.width,
    ascent: Math.max(options.ascent, options.shaped.ascent),
    descent: Math.max(options.descent, options.shaped.descent)
  };
}
