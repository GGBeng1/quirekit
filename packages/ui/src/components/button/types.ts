import type { QuireKitControlSize } from "../control";
import type { QuireKitSemanticTypographyRole } from "../../theme";

/** Public size names shared by Button and IconButton. */
export type QuireKitButtonSize = QuireKitControlSize;

/** IconButton 的默认圆角矩形或显式圆形轮廓。 */
export type QuireKitIconButtonShape = 'rounded' | 'circle';

/** Semantic color family available to Button and IconButton. */
export type QuireKitButtonColor =
  | "neutral"
  | "primary"
  | "info"
  | "success"
  | "warning"
  | "danger";

/** Paint and occupancy treatment applied independently from the color family. */
export type QuireKitButtonVariant =
  | "solid"
  | "outline"
  | "soft"
  | "ghost"
  | "text"
  | "link";

/** Geometry owned by one public button size. */
export interface QuireKitButtonSizeTokens {
  /** Stable target height for this size. */
  readonly height: string;
  /** Inline padding used by labeled buttons at this size. */
  readonly paddingInline: string;
  /** Gap between adjacent content slots at this size. */
  readonly gap: string;
  /** Icon box used by this size. */
  readonly iconSize: string;
  /** Corner radius used by this size. */
  readonly radius: string;
  /** Label font size approved for this control height. */
  readonly fontSize: string;
  /** Label line height approved for this control height. */
  readonly lineHeight: string;
}

/** Color channels from which Button variants compose their states. */
export interface QuireKitButtonColorTokens {
  /** Label and icon color on quiet variants. */
  readonly foreground: string;
  /** Label and icon color on a solid fill. */
  readonly solidForeground: string;
  /** Solid fill in the idle state. */
  readonly solidBackground: string;
  /** Hover fill that uses an existing palette token. */
  readonly solidHoverBackground: string;
  /** Pressed fill that uses an existing palette token. */
  readonly solidPressedBackground: string;
  /** Soft fill in the idle state. */
  readonly softBackground: string;
  /** Soft fill while hovered. */
  readonly softHoverBackground: string;
  /** Soft fill while pressed. */
  readonly softPressedBackground: string;
  /** Boundary used by outlined variants. */
  readonly borderColor: string;
}

/** Disabled-state values shared by every button variant. */
export interface QuireKitButtonDisabledTokens {
  /** Label and icon color when activation is unavailable. */
  readonly foreground: string;
  /** Target fill when activation is unavailable. */
  readonly background: string;
  /** Target boundary when activation is unavailable. */
  readonly borderColor: string;
}

/** Complete Button and IconButton component-token contract. */
export interface QuireKitButtonTokens {
  /** Font family shared by every public size. */
  readonly fontFamily: QuireKitSemanticTypographyRole["fontFamily"];
  /** Font weight shared by every public size. */
  readonly fontWeight: QuireKitSemanticTypographyRole["fontWeight"];
  /** Letter spacing shared by every public size. */
  readonly letterSpacing: QuireKitSemanticTypographyRole["letterSpacing"];
  /** Five public size projections. */
  readonly size: Readonly<Record<QuireKitButtonSize, QuireKitButtonSizeTokens>>;
  /** Semantic color channels consumed by the finite variant recipes. */
  readonly color: Readonly<Record<QuireKitButtonColor, QuireKitButtonColorTokens>>;
  /** Disabled-state values. */
  readonly disabled: QuireKitButtonDisabledTokens;
  /** Visible boundary width used by outlined variants. */
  readonly borderWidth: string;
  /** Boundary color used to distinguish keyboard focus without a ring. */
  readonly focusColor: string;
  /** Hover intensity applied without replacing semantic colors. */
  readonly hoverOpacity: number;
  /** Pressed intensity applied without replacing semantic colors. */
  readonly pressedOpacity: number;
  /** Feedback transition duration. */
  readonly feedbackDuration: string;
  /** Feedback transition easing. */
  readonly feedbackEasing: string;
}
