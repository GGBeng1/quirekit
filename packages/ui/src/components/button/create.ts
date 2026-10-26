import { quireKitControlSizes } from "../control";
import { parseQuireHexColor, quireContrastRatio } from "../../tokens";
import type { QuireKitTheme, QuireKitThemeColorScales } from "../../theme";
import type {
  QuireKitButtonColorTokens,
  QuireKitButtonTokens
} from "./types";

/**
 * Derives the approved Button and IconButton contract from semantic tokens.
 *
 * @param theme - Complete semantic theme selected by the host.
 * @returns Immutable Button and IconButton component tokens.
 */
export function createButtonTokens(theme: QuireKitTheme): QuireKitButtonTokens {
  const color = theme.color;
  return Object.freeze({
    fontFamily: theme.typography.control.fontFamily,
    fontWeight: theme.typography.body.fontWeight,
    letterSpacing: theme.typography.control.letterSpacing,
    size: Object.freeze({
      xs: Object.freeze({
        height: theme.control[quireKitControlSizes.xs.height],
        paddingInline: theme.spacing.inline,
        gap: theme.spacing.inlineTight,
        iconSize: theme.control.icon,
        radius: theme.radius.control,
        fontSize: theme.typography[quireKitControlSizes.xs.typography].fontSize,
        lineHeight: theme.typography[quireKitControlSizes.xs.typography].lineHeight
      }),
      sm: Object.freeze({
        height: theme.control[quireKitControlSizes.sm.height],
        paddingInline: theme.spacing.surfaceCompact,
        gap: theme.spacing.inlineTight,
        iconSize: theme.control.icon,
        radius: theme.radius.control,
        fontSize: theme.typography[quireKitControlSizes.sm.typography].fontSize,
        lineHeight: theme.typography[quireKitControlSizes.sm.typography].lineHeight
      }),
      md: Object.freeze({
        height: theme.control[quireKitControlSizes.md.height],
        paddingInline: theme.spacing.surfaceCompact,
        gap: theme.spacing.inline,
        iconSize: theme.control.icon,
        radius: theme.radius.control,
        fontSize: theme.typography[quireKitControlSizes.md.typography].fontSize,
        lineHeight: theme.typography[quireKitControlSizes.md.typography].lineHeight
      }),
      lg: Object.freeze({
        height: theme.control[quireKitControlSizes.lg.height],
        paddingInline: theme.spacing.surface,
        gap: theme.spacing.inline,
        iconSize: theme.control.icon,
        radius: theme.radius.group,
        fontSize: theme.typography[quireKitControlSizes.lg.typography].fontSize,
        lineHeight: theme.typography[quireKitControlSizes.lg.typography].lineHeight
      }),
      xl: Object.freeze({
        height: theme.control[quireKitControlSizes.xl.height],
        paddingInline: theme.spacing.surface,
        gap: theme.spacing.inline,
        iconSize: theme.control.iconLarge,
        radius: theme.radius.group,
        fontSize: theme.typography[quireKitControlSizes.xl.typography].fontSize,
        lineHeight: theme.typography[quireKitControlSizes.xl.typography].lineHeight
      })
    }),
    color: Object.freeze({
      neutral: Object.freeze({
        foreground: color.text.secondary,
        solidForeground: color.text.inverse,
        solidBackground: color.surface.inverse,
        solidHoverBackground: theme.scales.neutral[10],
        solidPressedBackground: theme.scales.neutral[theme.scheme === "light" ? 11 : 9],
        softBackground: theme.scheme === "light" ? color.surface.hover : color.surface.subtle,
        softHoverBackground: theme.color.surface.selected,
        softPressedBackground: color.surface.pressed,
        borderColor: color.border.default
      }),
      primary: Object.freeze({
        foreground: color.action.text,
        solidForeground: color.action.foreground,
        solidBackground: color.action.primary,
        ...(color.action.primary === theme.scales.neutral[11]
          ? { solidHoverBackground: color.action.hover, solidPressedBackground: color.action.pressed }
          : solidBackgrounds(color.action.foreground, theme, theme.scales.primary)),
        softBackground: color.action.soft,
        softHoverBackground: color.action.softHover,
        softPressedBackground: color.action.softPressed,
        borderColor: color.action.primary
      }),
      info: feedbackColor(color.info, theme, theme.scales.info),
      success: feedbackColor(color.success, theme, theme.scales.success),
      warning: feedbackColor(color.warning, theme, theme.scales.warning),
      danger: feedbackColor(color.danger, theme, theme.scales.danger)
    }),
    disabled: Object.freeze({
      foreground: color.text.disabled,
      background: color.surface.disabled,
      borderColor: color.border.disabled
    }),
    borderWidth: theme.borderWidth.default,
    focusColor: color.border.focus,
    hoverOpacity: theme.opacity.hover,
    pressedOpacity: theme.opacity.pressed,
    feedbackDuration: theme.motion.feedbackDuration,
    feedbackEasing: theme.motion.standardEasing
  });
}

/**
 * Maps one semantic feedback family into the common Button color channels.
 *
 * @param color - Semantic feedback roles compiled from one registered base source.
 * @param theme - Theme carrying the interaction strengths.
 * @param scale - Existing eleven-step family palette.
 * @returns Immutable Button color channels shared by every visual variant.
 */
function feedbackColor(
  color: QuireKitTheme["color"]["info"],
  theme: QuireKitTheme,
  scale: QuireKitThemeColorScales["primary"]
): QuireKitButtonColorTokens {
  return Object.freeze({
    foreground: color.text,
    solidForeground: color.onSolid,
    solidBackground: color.solid,
    ...solidBackgrounds(color.onSolid, theme, scale),
    softBackground: color.surface,
    softHoverBackground: color.hoverSurface,
    softPressedBackground: color.pressedSurface,
    borderColor: color.border
  });
}

/**
 * Selects the regular scheme direction when labels remain readable.
 * @param foreground - Fixed solid label color.
 * @param theme - Owning light or dark scheme.
 * @param scale - Existing eleven-step family palette.
 * @returns Palette hover and pressed fills without generating new colors.
 */
function solidBackgrounds(foreground: string, theme: QuireKitTheme, scale: QuireKitThemeColorScales["primary"]) {
  const regular = theme.scheme === "light" ? [7, 8] as const : [5, 4] as const;
  const alternate = theme.scheme === "light" ? [5, 4] as const : [7, 8] as const;
  const label = parseQuireHexColor(foreground);
  const readable = regular.every(step => quireContrastRatio(label, parseQuireHexColor(scale[step])) >= 4.5);
  const steps = readable ? regular : alternate;
  return {
    solidHoverBackground: scale[steps[0]],
    solidPressedBackground: scale[steps[1]]
  };
}
