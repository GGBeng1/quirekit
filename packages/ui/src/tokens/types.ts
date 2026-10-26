/** Supported QuireKit color schemes. */
export type QuireKitColorScheme = "light" | "dark";

/** Manually reviewed neutral palettes available to theme profiles. */
export type QuireKitNeutralPalette = "precision" | "ink" | "slate" | "stone";

/** Stable eleven-step color-scale index centered on the reviewed source. */
export type QuireKitColorStep = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11;

/** Eleven resolved colors ordered from quiet surface through source to readable content. */
export type QuireKitColorRamp = readonly [
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string,
  string
];

/** Eleven numeric samples used by one source-centered OKLCH generation curve. */
export type QuireKitColorCurve = readonly [
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number,
  number
];

/** Base named chromatic sources before semantic theme mapping. */
export interface QuireKitBaseColorSources {
  /** Restrained cobalt source used by the default Precision theme. */
  readonly cobalt: string;
  /** Violet source available to optional branded themes. */
  readonly violet: string;
  /** Blue source available for information and alternate themes. */
  readonly blue: string;
  /** Green source available for success feedback. */
  readonly green: string;
  /** Amber source available for warning feedback. */
  readonly amber: string;
  /** Red source available for danger feedback. */
  readonly red: string;
  /** Near-black source used by the Ink theme. */
  readonly ink: string;
}

/** Base OKLCH generation curves for one color scheme. */
export interface QuireKitBaseColorCurves {
  /** Per-step distance from the source lightness toward the scheme endpoint. */
  readonly lightnessShift: QuireKitColorCurve;
  /** Per-step multipliers applied to the source chroma. */
  readonly chroma: QuireKitColorCurve;
}

/** Base color inputs owned by the design system rather than a theme. */
export interface QuireKitBaseColorTokens {
  /** Named chromatic sources with no component meaning. */
  readonly source: QuireKitBaseColorSources;
  /** Pure white shared by document paper and light page, raised and overlay surfaces; defaults to neutral step one when omitted. */
  readonly white?: string;
  /** Manually reviewed neutral ramp for light surfaces. */
  readonly neutralLight: QuireKitColorRamp;
  /** Manually reviewed neutral ramp for dark surfaces. */
  readonly neutralDark: QuireKitColorRamp;
  /** Shadcn-style neutral ramp used by the light Ink profile. */
  readonly inkNeutralLight: QuireKitColorRamp;
  /** Shadcn-style neutral ramp used by the dark Ink profile. */
  readonly inkNeutralDark: QuireKitColorRamp;
  /** Optional overrides for additional neutral identities; each supplies both schemes. */
  readonly neutralPalettes?: Readonly<Partial<Record<"slate" | "stone", Readonly<Record<QuireKitColorScheme, QuireKitColorRamp>>>>>;
  /** OKLCH curves used by light themes. */
  readonly curveLight: QuireKitBaseColorCurves;
  /** OKLCH curves used by dark themes. */
  readonly curveDark: QuireKitBaseColorCurves;
  /** Optional reviewed ramps keyed by normalized source HEX and scheme; step six still preserves source. */
  readonly palettes?: Readonly<Record<string, Readonly<Partial<Record<QuireKitColorScheme, QuireKitColorRamp>>>>>;
  /** Palette step that preserves the reviewed chromatic source color. */
  readonly sourceStep: 6;
  /** Minimum contrast required from solid chromatic actions. */
  readonly minimumSolidContrast: number;
}

/** Product and code font families before semantic typography roles are composed. */
export interface QuireKitBaseFontFamilyTokens {
  /** Platform-native UI stack used by product chrome and controls. */
  readonly product: string;
  /** Platform-native monospace stack used by code and token values. */
  readonly mono: string;
}

/** Explicit font sizes used to compose semantic typography roles. */
export interface QuireKitBaseFontSizeTokens {
  /** Twelve-pixel font size. */
  readonly 12: "12px";
  /** Thirteen-pixel font size. */
  readonly 13: "13px";
  /** Fourteen-pixel font size. */
  readonly 14: "14px";
  /** Sixteen-pixel font size. */
  readonly 16: "16px";
  /** Twenty-pixel font size. */
  readonly 20: "20px";
  /** Twenty-eight-pixel font size. */
  readonly 28: "28px";
  /** Forty-pixel font size. */
  readonly 40: "40px";
}

/** Unitless line-height ratios indexed by the paired base font size. */
export interface QuireKitBaseLineHeightTokens {
  /** Twelve-pixel text with an approximately twenty-pixel line box. */
  readonly 12: "1.6667";
  /** Thirteen-pixel text with an approximately twenty-one-pixel line box. */
  readonly 13: "1.6154";
  /** Fourteen-pixel body text with an approximately twenty-two-pixel line box. */
  readonly 14: "1.5714";
  /** Sixteen-pixel text with a twenty-four-pixel line box. */
  readonly 16: "1.5";
  /** Twenty-pixel text with a twenty-eight-pixel line box. */
  readonly 20: "1.4";
  /** Twenty-eight-pixel text with an approximately thirty-six-pixel line box. */
  readonly 28: "1.2857";
  /** Forty-pixel text with a forty-eight-pixel line box. */
  readonly 40: "1.2";
}

/** Font weights admitted by the product typography system. */
export interface QuireKitBaseFontWeightTokens {
  /** Numeric weight 400. */
  readonly regular: 400;
  /** Numeric weight 500. */
  readonly medium: 500;
  /** Numeric weight 600. */
  readonly semibold: 600;
}

/** Letter-spacing values admitted by semantic typography roles. */
export interface QuireKitBaseLetterSpacingTokens {
  /** Browser-normal letter spacing. */
  readonly normal: "normal";
  /** Minus one-percent letter spacing. */
  readonly tight: "-0.01em";
}

/** Base typography values with no component meaning. */
export interface QuireKitBaseTypographyTokens {
  /** Approved font-family stacks. */
  readonly family: QuireKitBaseFontFamilyTokens;
  /** Approved font sizes. */
  readonly size: QuireKitBaseFontSizeTokens;
  /** Approved line heights. */
  readonly lineHeight: QuireKitBaseLineHeightTokens;
  /** Approved font weights. */
  readonly weight: QuireKitBaseFontWeightTokens;
  /** Approved letter spacing. */
  readonly letterSpacing: QuireKitBaseLetterSpacingTokens;
}

/** Layout spacing ruler; these values are not component-size variants. */
export interface QuireKitBaseSpacingTokens {
  /** No spacing. */ readonly 0: "0px";
  /** Two-pixel interval. */ readonly 2: "2px";
  /** Four-pixel interval. */ readonly 4: "4px";
  /** Six-pixel interval. */ readonly 6: "6px";
  /** Eight-pixel interval. */ readonly 8: "8px";
  /** Twelve-pixel interval. */ readonly 12: "12px";
  /** Sixteen-pixel interval. */ readonly 16: "16px";
  /** Twenty-pixel interval. */ readonly 20: "20px";
  /** Twenty-four-pixel interval. */ readonly 24: "24px";
  /** Thirty-two-pixel interval. */ readonly 32: "32px";
  /** Forty-pixel interval. */ readonly 40: "40px";
  /** Forty-eight-pixel interval. */ readonly 48: "48px";
  /** Sixty-four-pixel interval. */ readonly 64: "64px";
}

/** Unitless-purpose corner-radius values ordered by increasing curvature. */
export interface QuireKitBaseRadiusTokens {
  /** Square corner. */ readonly 0: "0px";
  /** Two-pixel corner radius. */ readonly 2: "2px";
  /** Four-pixel corner radius. */ readonly 4: "4px";
  /** Six-pixel corner radius. */ readonly 6: "6px";
  /** Eight-pixel corner radius. */ readonly 8: "8px";
  /** Twelve-pixel corner radius. */ readonly 12: "12px";
  /** Effectively fully rounded radius. */ readonly 999: "999px";
}

/** Border-width values ordered from absent to visually strong. */
export interface QuireKitBaseBorderWidthTokens {
  /** Zero-pixel width. */ readonly 0: "0px";
  /** One-pixel width. */ readonly 1: "1px";
  /** Two-pixel width. */ readonly 2: "2px";
}

/** Four-step elevation scale for one color scheme. */
export interface QuireKitBaseElevationScale {
  /** No elevation. */ readonly 0: "none";
  /** First elevation step. */ readonly 1: string;
  /** Second elevation step. */ readonly 2: string;
  /** Third elevation step. */ readonly 3: string;
}

/** Base elevation scales composed without component or surface names. */
export interface QuireKitBaseElevationTokens {
  /** Elevation scale evaluated on light surfaces. */ readonly light: QuireKitBaseElevationScale;
  /** Elevation scale evaluated on dark surfaces. */ readonly dark: QuireKitBaseElevationScale;
}

/** Base motion durations and easing curves. */
export interface QuireKitBaseMotionTokens {
  /** Explicit animation durations. */
  readonly duration: {
    /** Zero-duration state change. */ readonly 0: "0ms";
    /** One-hundred-twenty-millisecond duration. */ readonly 120: "120ms";
    /** One-hundred-eighty-millisecond duration. */ readonly 180: "180ms";
    /** Two-hundred-forty-millisecond duration. */ readonly 240: "240ms";
  };
  /** Explicit easing curves. */
  readonly easing: {
    /** Balanced state transition. */ readonly standard: string;
    /** Acceleration curve that ends quickly. */ readonly accelerate: string;
    /** Deceleration curve that settles into place. */ readonly decelerate: string;
  };
}

/** Unit opacity values ordered from transparent to opaque. */
export interface QuireKitBaseOpacityTokens {
  /** Zero percent opacity. */ readonly 0: 0;
  /** Thirty percent opacity. */ readonly 30: 0.3;
  /** Forty-two percent opacity. */ readonly 42: 0.42;
  /** Sixty-eight percent opacity. */ readonly 68: 0.68;
  /** Seventy-eight percent opacity. */ readonly 78: 0.78;
  /** Eighty-eight percent opacity. */ readonly 88: 0.88;
  /** Ninety-four percent opacity. */ readonly 94: 0.94;
  /** One-hundred percent opacity. */ readonly 100: 1;
}

/** Numeric stacking levels with reserved gaps for future semantic mappings. */
export interface QuireKitBaseLayerTokens {
  /** Zero stacking level. */ readonly 0: 0;
  /** One-hundred stacking level. */ readonly 100: 100;
  /** One-thousand stacking level. */ readonly 1000: 1000;
  /** One-thousand-one-hundred stacking level. */ readonly 1100: 1100;
  /** One-thousand-two-hundred stacking level. */ readonly 1200: 1200;
  /** One-thousand-three-hundred stacking level. */ readonly 1300: 1300;
}

/** Discrete square or block-axis size values without component meaning. */
export interface QuireKitBaseSizeTokens {
  /** Sixteen-pixel size. */ readonly 16: "16px";
  /** Twenty-pixel size. */ readonly 20: "20px";
  /** Twenty-four-pixel size. */ readonly 24: "24px";
  /** Twenty-eight-pixel size. */ readonly 28: "28px";
  /** Thirty-two-pixel size. */ readonly 32: "32px";
  /** Thirty-six-pixel size. */ readonly 36: "36px";
  /** Forty-pixel size. */ readonly 40: "40px";
  /** Forty-four-pixel size. */ readonly 44: "44px";
}

/** Base-token schema from which every QuireKit semantic theme is compiled. */
export interface QuireKitBaseTokens {
  /** Base color sources, neutral ramps, and OKLCH curves. */
  readonly color: QuireKitBaseColorTokens;
  /** Base typography values. */
  readonly typography: QuireKitBaseTypographyTokens;
  /** Base layout-spacing ruler. */
  readonly spacing: QuireKitBaseSpacingTokens;
  /** Base corner-radius ruler. */
  readonly radius: QuireKitBaseRadiusTokens;
  /** Base border-width ruler. */
  readonly borderWidth: QuireKitBaseBorderWidthTokens;
  /** Base shadow values. */
  readonly elevation: QuireKitBaseElevationTokens;
  /** Base duration and easing values. */
  readonly motion: QuireKitBaseMotionTokens;
  /** Base opacity values. */
  readonly opacity: QuireKitBaseOpacityTokens;
  /** Base stacking values. */
  readonly layer: QuireKitBaseLayerTokens;
  /** Base discrete sizes. */
  readonly size: QuireKitBaseSizeTokens;
}
