import type { QuireKitButtonColor } from "../button";
/** Static labels use the same semantic color families as existing controls. */
export type QuireKitTagColor = QuireKitButtonColor;
/** Label density, independent of clickable control height. */
export type QuireKitTagSize = "xs" | "sm" | "md";
/** Quiet fill, outlined label, or strong semantic fill. */
export type QuireKitTagVariant = "soft" | "subtle" | "outline" | "solid";
/** Theme-derived tag colors. */
export interface QuireKitTagColorTokens {
  /** Readable semantic text. */
  readonly text: string;
  /** Quiet semantic surface. */
  readonly surface: string;
  /** Outline boundary. */
  readonly border: string;
  /** Strong semantic fill. */
  readonly solid: string;
  /** Text paired with the strong fill. */
  readonly onSolid: string;
}
/** Tag configuration composed from existing theme roles. */
export interface QuireKitTagTokens {
  /** Registered semantic color families. */
  readonly color: Readonly<Record<QuireKitTagColor, QuireKitTagColorTokens>>;
  /** Horizontal label inset. */
  readonly paddingInline: string;
  /** Small vertical inset basis, divided by two in the recipe. */
  readonly paddingBlock: string;
  /** Space between text, decorative content and removal action. */
  readonly gap: string;
  /** Modest label corners. */
  readonly radius: string;
  /** Shared boundary thickness. */
  readonly borderWidth: string;
}
