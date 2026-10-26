import type { QuireKitTheme } from "../../theme";
import type { QuireKitToolbarTokens } from "./types";

/**
 * Derives Toolbar component tokens from the approved semantic theme.
 *
 * @param theme - Complete semantic theme selected by the host.
 * @returns Immutable Toolbar component-token contract.
 */
export function createToolbarTokens(theme: QuireKitTheme): QuireKitToolbarTokens {
  return Object.freeze({
    typography: Object.freeze({
      fontFamily: theme.typography.compact.fontFamily,
      fontSize: theme.typography.compact.fontSize,
      lineHeight: theme.typography.compact.lineHeight,
      fontWeight: theme.typography.control.fontWeight,
      letterSpacing: theme.typography.compact.letterSpacing
    }),
    geometry: Object.freeze({
      itemHeight: theme.control.default,
      iconSize: theme.control.icon,
      splitDisclosureWidth: theme.control.icon,
      itemPaddingInline: theme.spacing.inline,
      itemGap: theme.spacing.inlineTight,
      groupGap: theme.spacing.inlineTight,
      toolbarGap: theme.spacing.inline,
      itemRadius: theme.radius.control,
      borderWidth: theme.borderWidth.default,
      separatorWidth: theme.borderWidth.default,
      separatorInset: theme.spacing.inlineTight
    }),
    color: Object.freeze({
      surface: theme.color.surface.chrome,
      foreground: theme.color.icon.secondary,
      hoverBackground: theme.color.surface.hover,
      activeBackground: theme.color.surface.pressed,
      selectedBackground: theme.color.surface.selected,
      focusBorder: theme.color.border.focus,
      disabledForeground: theme.color.icon.disabled,
      separator: theme.color.border.subtle
    }),
    feedbackDuration: theme.motion.feedbackDuration,
    feedbackEasing: theme.motion.standardEasing
  });
}
