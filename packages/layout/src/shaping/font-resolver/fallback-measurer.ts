import { segmentQuireTextGraphemes } from "../../text/segments";
import type {
  QuireShapedTextCluster,
  QuireShapedTextRun,
  QuireTextShapeContext,
  QuireTextMeasurer
} from "../../text/types";

/**
 * Shapes text through the fallback measurer or returns an empty run.
 *
 * @param text - Unresolved text segment.
 * @param font - CSS font shorthand used for measurement.
 * @param measurer - Optional fallback measurer.
 * @param context - Per-run language and direction overrides.
 * @returns Shaped fallback run.
 */
export function shapeTextWithFallbackMeasurer(
  text: string,
  font: string,
  measurer: QuireTextMeasurer | undefined,
  context?: QuireTextShapeContext
): QuireShapedTextRun {
  if (!measurer) {
    return {
      clusters: [],
      width: 0,
      ascent: 0,
      descent: 0
    };
  }

  if (measurer.shapeRun) {
    return measurer.shapeRun(text, font, context);
  }

  return shapeFallbackTextWithMeasureText(text, font, measurer);
}

/**
 * Builds fallback clusters from width-only text measurement.
 *
 * @param text - Text content to shape.
 * @param font - CSS font shorthand used for measurement.
 * @param measurer - Width-only fallback measurer.
 * @returns Baseline shaped text run.
 */
function shapeFallbackTextWithMeasureText(
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
