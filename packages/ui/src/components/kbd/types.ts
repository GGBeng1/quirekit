
/** Independent inline keycap scales, not control heights. */
export type QuireKitKbdSize = "xs" | "sm" | "md";

/** Theme roles for semantic keyboard hints. */
export interface QuireKitKbdTokens {
  /** Quiet readable text. */
  readonly foreground: string;
  /** Discrete key surface. */
  readonly background: string;
  /** Key outline. */
  readonly borderColor: string;
  /** Shared boundary thickness. */
  readonly borderWidth: string;
  /** Small key corners. */
  readonly radius: string;
  /** Monospace family shared with code typography. */
  readonly fontFamily: string;
  /** Code typography weight. */
  readonly fontWeight: number;
  /** Code typography letter spacing. */
  readonly letterSpacing: string;
  /** Keycap geometry and text for every shared density. */
  readonly size: Readonly<Record<QuireKitKbdSize, QuireKitKbdSizeTokens>>;
}

/** Size affects the visible keycap, not a separate hit target. */
export interface QuireKitKbdSizeTokens {
  /** Minimum visible height and single-key width. */
  readonly minHeight: string;
  /** Key text size. */
  readonly fontSize: string;
  /** Horizontal breathing room for named or combined keys. */
  readonly paddingInline: string;
}
