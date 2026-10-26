import type { QuireKitTheme } from "../../theme";
import type { QuireKitMenuTokens } from "./types";

/**
 * Derives Menu component tokens from the approved semantic theme.
 *
 * @param theme - Complete semantic theme selected by the host.
 * @returns Immutable Menu component-token contract.
 */
export function createMenuTokens(theme: QuireKitTheme): QuireKitMenuTokens {
  return Object.freeze({
    typography: Object.freeze({
      fontFamily: theme.typography.compact.fontFamily,
      fontSize: theme.typography.compact.fontSize,
      lineHeight: theme.typography.compact.lineHeight,
      fontWeight: theme.typography.control.fontWeight,
      letterSpacing: theme.typography.compact.letterSpacing
    }),
    metadataTypography: Object.freeze({
      fontFamily: theme.typography.code.fontFamily,
      fontSize: theme.typography.helper.fontSize,
      lineHeight: theme.typography.helper.lineHeight
    }),
    color: Object.freeze({
      surface: theme.color.surface.overlay,
      border: theme.color.border.subtle,
      separator: theme.color.border.subtle,
      foreground: theme.color.text.secondary,
      highlightedForeground: theme.color.text.primary,
      highlightedBackground: theme.color.surface.hover,
      checkedBackground: theme.color.surface.selected,
      metadataForeground: theme.color.text.tertiary,
      disabledForeground: theme.color.text.disabled,
      dangerForeground: theme.color.danger.text,
      dangerHighlightedBackground: theme.color.danger.surface
    }),
    geometry: Object.freeze({
      contentWidth: "200px",
      contentPadding: theme.spacing.inlineTight,
      itemHeight: theme.control.regular,
      itemPaddingInline: theme.spacing.surfaceCompact,
      itemGap: theme.spacing.inline,
      iconSize: theme.control.icon,
      overlayRadius: theme.radius.overlay,
      itemRadius: theme.radius.control,
      borderWidth: theme.borderWidth.default,
      separatorWidth: theme.borderWidth.default,
      separatorInset: theme.spacing.inline,
      groupLabelPaddingBlock: theme.spacing.inlineTight,
      groupLabelPaddingInline: theme.spacing.surfaceCompact
    }),
    shadow: theme.elevation.overlay,
    layer: theme.layer.overlay,
    feedbackDuration: theme.motion.feedbackDuration,
    overlayDuration: theme.motion.overlayDuration,
    feedbackEasing: theme.motion.standardEasing,
    enterEasing: theme.motion.enterEasing,
    exitEasing: theme.motion.exitEasing
  });
}
