import type { Preset } from "@unocss/core";

/** Supported options for the framework-neutral QuireKit UnoCSS preset. */
export interface QuireKitUnoPresetOptions {
  /** Whether the preset emits semantic variables for built-in theme profiles. */
  readonly defaultTokens?: boolean | undefined;
}

/** Recommended UnoCSS configuration returned for QuireKit applications. */
export interface QuireKitUnoConfig {
  /** Presets required by QuireKit semantic utilities. */
  readonly presets: Preset[];
  /** Stable cascade order used by QuireKit and application utilities. */
  readonly layers: Readonly<Record<string, number>>;
  /** Explicit semantic classes that must remain available to adapters. */
  readonly safelist: string[];
  /** CSS Cascade Layer projection for generated output. */
  readonly outputToCssLayers: true;
  /** Variant separators; only `:`, so component classes such as `md-outline` are never read as `md:outline`. */
  readonly separators: string[];
}
