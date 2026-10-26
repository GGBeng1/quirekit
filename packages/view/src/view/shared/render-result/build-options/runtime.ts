import type { QuireViewBuildOptions } from "../../../types";
import { resolveMountedCaretOmitsOverlayCaret } from "../../caret";
import type { MountedFrameRuntimeOptions } from "./types";

/**
 * Projects current mounted policies through one shared frame-input boundary.
 * @param inputs - Frame-local geometry, invalidation, and presentation inputs.
 * @param runtime - Current mounted measurement and styling policies.
 * @returns Exact inputs used by both full builds and retained-layout admission.
 */
export function createMountedFrameBuildOptions(
  inputs: QuireViewBuildOptions,
  runtime: MountedFrameRuntimeOptions = {}
): QuireViewBuildOptions {
  return {
    textMeasurer: runtime.textMeasurer,
    lineBreaker: runtime.lineBreaker,
    hiddenTextViewMode: runtime.hiddenTextViewMode,
    listMarkerCollision: runtime.listMarkerCollision,
    pageGeometry: runtime.pageGeometry,
    widows: runtime.widows,
    orphans: runtime.orphans,
    displayListStyles: runtime.displayListStyles,
    surfaceConfig: runtime.surfaceConfig,
    omitCaretCommands: resolveMountedCaretOmitsOverlayCaret(runtime.caretRendering),
    ...inputs
  };
}
