/** One normalized sRGB color. */
export interface QuireSrgbColor {
  /** Red channel from zero through one. */
  readonly r: number;
  /** Green channel from zero through one. */
  readonly g: number;
  /** Blue channel from zero through one. */
  readonly b: number;
}

/** One perceptual OKLCH color. */
export interface QuireOklchColor {
  /** Perceptual lightness from zero through one. */
  readonly l: number;
  /** Perceptual chroma. */
  readonly c: number;
  /** Hue angle in degrees. */
  readonly h: number;
}
