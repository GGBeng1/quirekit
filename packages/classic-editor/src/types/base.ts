import type { QuireListMarkerCollisionPolicy } from "@quirekit/view";

/** First-class document rendering backends exposed by the product shell. */
export type ClassicEditorViewBackend = "canvas" | "svg";

/** Product view selection independent from backend-specific runtime tuning. */
export interface ClassicEditorViewOptions {
  /** Active rendering backend. Defaults to Canvas. */
  readonly backend?: ClassicEditorViewBackend | undefined;
  /** List-prefix collision policy shared by Canvas and SVG. Defaults to compact. */
  readonly listMarkerCollision?: QuireListMarkerCollisionPolicy | undefined;
}

/** Bundled product-interface locales. */
export type ClassicEditorLocale = "zh-CN" | "en";

/** Complete bilingual visible copy used by product contributions. */
export interface ClassicEditorBilingualText {
  /** Simplified Chinese copy. */
  readonly "zh-CN": string;
  /** English copy. */
  readonly en: string;
}

/** Visible product copy that is language-neutral or bundled bilingual text. */
export type ClassicEditorText = string | ClassicEditorBilingualText;

/** Opaque feature switches recognized by installed presets and Extensions. */
export interface ClassicEditorFeatureOptions {
  /** Enables or disables the capability identified by each stable feature id. */
  readonly [feature: string]: boolean | undefined;
}

/** Fully resolved feature switches keyed by stable feature id. */
export type ClassicEditorResolvedFeatures = Readonly<Record<string, boolean>>;
