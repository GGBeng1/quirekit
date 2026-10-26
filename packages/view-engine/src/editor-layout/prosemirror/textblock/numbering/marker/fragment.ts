import type { QuireTextFragment } from "@quirekit/layout/text";
import type { CreateWordNumberingMarkerFragmentOptions, WordNumberingMarkerFragmentPlan } from "../types";
import { quireNeutralDocumentProfile } from "../../../../../document-profile/defaults";
import { resolveQuireTextblockMarkerX } from "./geometry";
import { resolveQuireNumberingSuffixAdvance } from "./suffix";
import { resolveExplicitMarkerAscent, resolveFirstLineMetrics } from "./metrics";

/**
 * Creates one generated marker fragment outside the editable source range.
 *
 * @param options - Marker semantics, paragraph geometry, and text metrics.
 * @returns Marker fragment with no caret stops.
 */
export function createWordNumberingMarkerFragment(
  options: CreateWordNumberingMarkerFragmentOptions
): WordNumberingMarkerFragmentPlan {
  const model = options.paragraphModel ?? quireNeutralDocumentProfile.paragraphModel;
  const { explicitFontSize, baselineShift, ...typography } = model.markerTypography(
    options.marker,
    options.font,
    options.documentFontTheme,
    {
      textColor: options.inheritedTextColor,
      textDecoration: options.inheritedTextDecoration
    }
  );
  const markerWidth = options.marker.kind === "task"
    ? Math.max(12, Math.min(16, options.lineHeight * 0.62))
    : options.textMeasurer.measureText(typography.text, typography.font).width;
  const spaceWidth = options.textMeasurer.measureText(" ", typography.font).width;
  const markerX = resolveQuireTextblockMarkerX({
    geometry: options.geometry,
    firstLine: model.resolveIndentation(options.marker.indentation, options.characterPitch).firstLine,
    baseDirection: options.baseDirection,
    markerWidth,
    gap: options.marker.suffix === "nothing" ? 0 : spaceWidth,
    justification: options.marker.justification
  });
  // Measure and align first, then resolve tabs in logical paragraph coordinates.
  // The resulting advance is consumed by both first-line layout and hit geometry.
  const suffixAdvance = resolveQuireNumberingSuffixAdvance(
    options.marker, markerX, markerWidth, options.paragraphWidth,
    options.baseDirection === "rtl", options.characterPitch, spaceWidth, model, options.collisionPolicy
  );
  const firstLineAscent = resolveExplicitMarkerAscent(
    explicitFontSize, options.font, typography.font, options.baseline, options.textMeasurer
  );
  const markerLineMetrics = resolveFirstLineMetrics(
    options.lineHeight,
    options.baseline,
    firstLineAscent
  );
  const fragment: QuireTextFragment = {
    ...typography,
    id: `${options.id}:word-marker`,
    text: options.marker.kind === "task" ? "" : typography.text,
    range: { from: options.contentStart, to: options.contentStart },
    rect: {
      x: markerX,
      y: 0,
      width: markerWidth,
      height: markerLineMetrics.height
    },
    lineHeight: markerLineMetrics.height,
    baseline: markerLineMetrics.ascent,
    caretStops: []
  };
  return {
    fragment,
    suffixAdvance,
    ...(baselineShift === undefined || baselineShift === 0 ? {} : { baselineShift }),
    ...(firstLineAscent === undefined ? {} : { firstLineAscent })
  };
}
