import type { QuireKitButtonColor } from "../button";
/** Notification markers use the same semantic color families as existing controls. */
export type QuireKitBadgeColor = QuireKitButtonColor;
/** Marker density, independent of clickable control height. */
export type QuireKitBadgeSize = "xs" | "sm" | "md";
/** Quiet fill, outline, or strong semantic fill. */
export type QuireKitBadgeVariant = "soft" | "outline" | "solid";
/** Theme-derived badge colors. */
export interface QuireKitBadgeColorTokens {
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
/** Badge configuration composed from existing theme roles. */
export interface QuireKitBadgeTokens {
  /** Registered semantic color families. */
  readonly color: Readonly<Record<QuireKitBadgeColor, QuireKitBadgeColorTokens>>;
  /** Horizontal label inset. */
  readonly paddingInline: string;
  /** Visual diameter of a text-free dot. */
  readonly dotSize: string;
  /** Per-density count geometry and type. */
  readonly size: Readonly<Record<QuireKitBadgeSize, QuireKitBadgeSizeTokens>>;
  /** Modest label corners. */
  readonly radius: string;
  /** Shared boundary thickness. */
  readonly borderWidth: string;
}

/** Notification counts remain compact without becoming clickable controls. */
export interface QuireKitBadgeSizeTokens {
  /** Minimum count diameter; larger values grow horizontally. */
  readonly height: string;
  /** Count text size. */
  readonly fontSize: string;
}
