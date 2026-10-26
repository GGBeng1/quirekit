import type { QuireInlineLayoutOptions } from "@quirekit/layout/inline";

/** Block-scoped text metrics derived from a node's base canvas text style. */
export interface QuireNodeTextMetrics extends Pick<QuireInlineLayoutOptions,
  "lineHeight" | "lineHeightMode" | "lineHeightStep" | "lineSpacing"
> {
  /** Base CSS font shorthand for the node's inline content. */
  readonly font: string;
  /** Vertical offset from the line top to the text baseline. */
  readonly baselineOffset: number;
}

/** Paint-only legacy Word glyph effects consumed by fixed-layout paint. */
export type QuireMarkedGlyphEffect = "outline" | "shadow" | "emboss" | "imprint";

/** Text-decoration line kinds a mark can contribute (CSS names). */
export type QuireMarkTextDecoration =
  | "underline"
  | "line-through"
  | "double-line-through"
  | "overline";
