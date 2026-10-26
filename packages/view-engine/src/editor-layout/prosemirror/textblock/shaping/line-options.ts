import type { QuireInlineLayoutOptions } from "@quirekit/layout/inline";
import type { ShapeTextblockFragmentsRequest } from "./types";

/**
 * Projects the same line policy for full shaping and retained-tail windows.
 * @param request - Resolved paragraph metrics and shared shaping policies.
 * @returns Canonical inline line options, including unscaled spacing fallback.
 */
export function projectTextblockLineOptions(
  request: Pick<ShapeTextblockFragmentsRequest, "metrics" | "options" | "baseDirection" | "avoidPunctuationBreaks" | "autoSpacing">
): Pick<
  QuireInlineLayoutOptions,
  "lineHeight" | "lineHeightMode" | "lineHeightStep" | "lineSpacing" | "textBaselineOffset"
  | "textMeasurer" | "lineBreakMode" | "avoidPunctuationBreaks" | "autoSpacing" | "baseDirection" | "trace" | "lineBreaker"
> {
  const { metrics, options } = request;
  return {
    lineHeight: metrics.lineHeight,
    lineHeightMode: metrics.lineHeightMode,
    lineHeightStep: metrics.lineHeightStep,
    lineSpacing: metrics.lineSpacing,
    textBaselineOffset: metrics.baselineOffset,
    textMeasurer: options.textMeasurer,
    lineBreakMode: options.lineBreakMode,
    avoidPunctuationBreaks: request.avoidPunctuationBreaks,
    autoSpacing: request.autoSpacing,
    baseDirection: request.baseDirection,
    ...(options.trace === undefined ? {} : { trace: options.trace }),
    ...(options.lineBreaker === undefined ? {} : { lineBreaker: options.lineBreaker })
  };
}
