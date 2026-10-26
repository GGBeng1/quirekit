import type { QuireLoadedShaperFont } from "../types";

/** CSS font request resolved from a shorthand token. */
export interface QuireFontRequest {
  /** Ordered CSS font families requested by the run. */
  readonly families: readonly string[];
  /** Requested CSS font style. */
  readonly style: string;
  /** Requested numeric CSS font weight. */
  readonly weight: number;
}

/** Options used to create a canvas font resolver. */
export interface QuireFontResolverOptions {
  /** Loaded fonts available to the resolver. */
  readonly fonts: readonly QuireLoadedShaperFont[];
  /** Ordered fallback families consulted after requested families. */
  readonly fallbackFamilies?: readonly string[];
}

/** One text slice resolved to a concrete loaded font. */
export interface QuireResolvedFontRun {
  /** Source offset relative to the original text, inclusive. */
  readonly from: number;
  /** Source offset relative to the original text, exclusive. */
  readonly to: number;
  /** Text slice represented by this run. */
  readonly text: string;
  /** Loaded font selected for this run. */
  readonly font: QuireLoadedShaperFont;
}

/** Resolver that maps CSS font requests and text coverage to concrete fonts. */
export interface QuireFontResolver {
  /**
   * Resolves one text run into concrete font slices.
   *
   * @param text - Text content to resolve.
   * @param font - CSS font shorthand requested by layout.
   * @returns Font-resolved text slices.
   */
  resolveTextRuns(text: string, font: string): readonly QuireResolvedFontRun[];
}
