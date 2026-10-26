import {
  QUIREKIT_DEFAULT_CANVAS_FONT,
  defaultQuireTextMeasurer
} from "@quirekit/layout/text";
import type { QuireLineBreakMode } from "@quirekit/layout/inline";

/** Default one-line block height used by the snapshot fallback path. */
export const quireDefaultLayoutBlockHeight = 24;

/** Default vertical gap between top-level layout blocks. */
export const blockGap = 0;

/** Default font used when the caller does not provide one. */
export const quireDefaultLayoutFont = QUIREKIT_DEFAULT_CANVAS_FONT;

/** Default text baseline offset for canvas text drawing. */
export const quireDefaultLayoutTextBaselineOffset = 18;

/** Default inline line-break behavior for snapshot layout. */
export const quireDefaultLayoutLineBreakMode: QuireLineBreakMode = "word";

/** Default text measurer used when no runtime measurer is supplied. */
export const defaultLayoutTextMeasurer = defaultQuireTextMeasurer;
