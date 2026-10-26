import { segmentQuireTextGraphemes } from "./segments";
import type { QuireShapedTextCluster, QuireShapedTextRun, QuireTextMeasurer } from "./types";

/**
 * Shapes a text run through the best backend exposed by the measurer.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand used for measurement.
 * @param measurer - Text measurer or shaper backend.
 * @param horizontalScale - Width-only ratio applied after natural shaping.
 * @returns Cluster-based shape result for the supplied run.
 */
export function shapeQuireTextRun(
  text: string,
  font: string,
  measurer: QuireTextMeasurer,
  horizontalScale = 1
): QuireShapedTextRun {
  if (!Number.isFinite(horizontalScale) || horizontalScale <= 0) {
    throw new RangeError("Horizontal text scale must be positive and finite.");
  }
  const shape = measurer.shapeRun?.(text, font)
    ?? shapeQuireTextRunWithMeasureText(text, font, measurer);
  if (horizontalScale === 1) return shape;
  // The natural font metrics stay cacheable; only this fragment's horizontal
  // geometry changes. Accepted layout callers already provide scaled stops.
  return { ...shape, width: shape.width * horizontalScale,
    clusters: shape.clusters.map(cluster => ({ ...cluster,
      x: cluster.x * horizontalScale, advance: cluster.advance * horizontalScale })),
    ...(shape.glyphs === undefined ? {} : { glyphs: shape.glyphs.map(glyph => ({ ...glyph,
      x: glyph.x * horizontalScale, xAdvance: glyph.xAdvance * horizontalScale,
      xOffset: glyph.xOffset * horizontalScale })) })
  };
}

/**
 * Builds a baseline cluster shape with measureText and Intl.Segmenter.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand used for measurement.
 * @param measurer - Width-only text measurer.
 * @returns Left-to-right grapheme cluster shape result.
 */
function shapeQuireTextRunWithMeasureText(
  text: string,
  font: string,
  measurer: QuireTextMeasurer
): QuireShapedTextRun {
  const clusters: QuireShapedTextCluster[] = [];
  const segments = segmentQuireTextGraphemes(text);
  let prefix = "";
  let sourceOffset = 0;
  let previousWidth = 0;

  for (const segment of segments) {
    prefix += segment;
    const width = measurer.measureText(prefix, font).width;
    clusters.push({
      from: sourceOffset,
      to: sourceOffset + segment.length,
      x: previousWidth,
      advance: width - previousWidth,
      rtl: false
    });
    sourceOffset += segment.length;
    previousWidth = width;
  }

  return {
    clusters,
    width: previousWidth,
    ascent: 0,
    descent: 0
  };
}
