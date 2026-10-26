/** UnoCSS theme projection owned by the QuireKit preset compiler. */
export interface QuireKitUnoTheme {
  /** Flat, enumerable color-token namespace consumed by standard utilities. */
  readonly colors: Readonly<Record<string, string>>;
  /** Semantic spacing tokens consumed by padding, margin, gap, width, and height utilities. */
  readonly spacing: Readonly<Record<string, string>>;
  /** Semantic radius tokens consumed by rounded utilities. */
  readonly borderRadius: Readonly<Record<string, string>>;
  /** Semantic line widths consumed by border utilities. */
  readonly lineWidth: Readonly<Record<string, string>>;
  /** Semantic elevations consumed by shadow utilities. */
  readonly boxShadow: Readonly<Record<string, string>>;
  /** Semantic font families. */
  readonly fontFamily: Readonly<Record<string, string>>;
  /** Semantic font sizes, optionally paired with their approved line height. */
  readonly fontSize: Readonly<Record<string, string | [string, string]>>;
  /** Semantic line heights. */
  readonly lineHeight: Readonly<Record<string, string>>;
  /** Semantic font weights. */
  readonly fontWeight: Readonly<Record<string, string>>;
  /** Semantic letter spacing. */
  readonly letterSpacing: Readonly<Record<string, string>>;
  /** Semantic control heights. */
  readonly height: Readonly<Record<string, string>>;
  /** Semantic control widths. */
  readonly width: Readonly<Record<string, string>>;
  /** Semantic opacity states. */
  readonly opacity: Readonly<Record<string, string | number>>;
  /** Semantic stack levels. */
  readonly zIndex: Readonly<Record<string, string>>;
  /** Semantic transition durations. */
  readonly duration: Readonly<Record<string, string>>;
  /** Semantic transition easing curves. */
  readonly easing: Readonly<Record<string, string>>;
}
