import type { QuireViewBuildOptions } from "../../../types";
import type { QuireMountedCaretRenderingMode } from "../../types";

/** Mounted policies that participate in a renderer-neutral frame build. */
export type MountedFrameRuntimeOptions = Partial<Pick<QuireViewBuildOptions,
  | "textMeasurer" | "lineBreaker" | "hiddenTextViewMode" | "listMarkerCollision"
  | "pageGeometry" | "widows" | "orphans" | "displayListStyles" | "surfaceConfig"
>> & {
  /** Backend that owns visible caret presentation. */
  readonly caretRendering?: QuireMountedCaretRenderingMode | undefined;
};
