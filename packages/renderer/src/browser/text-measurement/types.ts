/** Host font metrics in logical CSS pixels, independent of editor or layout. */
export interface QuireBrowserTextMetrics {
  /** Measured inline advance. */
  readonly width: number;
  /** Font-box ascent, never current-string ink bounds. */
  readonly ascent?: number;
  /** Font-box descent, never current-string ink bounds. */
  readonly descent?: number;
  /** Browser normal line height for the text's script. */
  readonly lineHeight?: number;
}

/** Explicit, bounded browser text measurement capability. */
export interface QuireBrowserTextMeasurer {
  /**
   * Measures text through the owning browser's Canvas and normal line strut.
   * @param text - Text to measure.
   * @param font - CSS font shorthand.
   * @returns Logical CSS-pixel metrics.
   */
  measureText(text: string, font: string): QuireBrowserTextMetrics;
  /** Clears caches after font changes or at the end of the owning lifecycle. */
  clear(): void;
}

/** Inputs for a detached browser measurer; never reads a global document. */
export interface QuireBrowserTextMeasurerOptions {
  /** Host document used for temporary probes. */
  readonly ownerDocument: Document;
  /** Maximum entries per cache; defaults to 32768, zero disables caching. */
  readonly cacheSize?: number | undefined;
}

/** Internal script-aware normal-line-height reader. */
export interface BrowserNormalLineHeightReader {
  /**
   * Reads one script's browser-normal line height.
   * @param font - CSS font shorthand.
   * @param text - Text selecting the fallback script face.
   * @returns Positive line height, or undefined when unavailable.
   */
  measure(font: string, text: string): number | undefined;
  /** Clears cached font/script metrics. */
  clear(): void;
}
