import {
  quireDefaultLayoutBlockHeight,
  quireDefaultLayoutFont,
  quireDefaultLayoutLineBreakMode,
  quireDefaultLayoutTextBaselineOffset
} from "@quirekit/view-engine";
import type {
  CanvasMountedTextLayoutConfig,
  CanvasMountedViewRuntimeOptions
} from "./types";

/**
 * Resolves the text-layout authority shared by canonical and accelerator builds.
 *
 * Display-list styles historically fed both paint and snapshot layout. Background
 * jobs must consume the same font and baseline instead of silently reverting to
 * snapshot defaults, otherwise their retained products are valid under a
 * different measurement environment.
 *
 * @param runtime - Mounted runtime options selected by the host.
 * @returns Canonical font, line, baseline, and breaking configuration.
 */
export function resolveCanvasMountedTextLayoutConfig(
  runtime: CanvasMountedViewRuntimeOptions | undefined
): CanvasMountedTextLayoutConfig {
  return {
    font: runtime?.displayListStyles?.font ?? quireDefaultLayoutFont,
    lineHeight: quireDefaultLayoutBlockHeight,
    textBaselineOffset:
      runtime?.displayListStyles?.textBaselineOffset ?? quireDefaultLayoutTextBaselineOffset,
    lineBreakMode: quireDefaultLayoutLineBreakMode
  };
}
