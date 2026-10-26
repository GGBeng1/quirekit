import type { QuireKitTheme } from "../../theme";
import type { QuireKitPopoverTokens } from "./types";

/**
 * 从完整语义主题派生 Popover 组件 token。
 *
 * @param theme - 宿主已经解析完成的语义主题。
 * @returns 不可变的 Popover 组件 token。
 */
export function createPopoverTokens(
  theme: QuireKitTheme
): QuireKitPopoverTokens {
  return Object.freeze({
    background: theme.color.surface.overlay,
    foreground: theme.color.text.primary,
    mutedForeground: theme.color.text.secondary,
    borderColor: theme.color.border.default,
    borderWidth: theme.borderWidth.default,
    radius: theme.radius.overlay,
    shadow: theme.elevation.overlay,
    padding: theme.spacing.surface,
    gap: theme.spacing.inline,
    arrowSize: theme.spacing.inline,
    closeSize: theme.control.default,
    closeRadius: theme.radius.control,
    closeHoverBackground: theme.color.surface.hover,
    closeForeground: theme.color.icon.secondary,
    focusColor: theme.color.border.focus,
    fontFamily: theme.typography.body.fontFamily,
    title: Object.freeze({
      fontSize: theme.typography.heading.fontSize,
      lineHeight: theme.typography.heading.lineHeight,
      fontWeight: theme.typography.heading.fontWeight,
      letterSpacing: theme.typography.heading.letterSpacing
    }),
    body: Object.freeze({
      fontSize: theme.typography.body.fontSize,
      lineHeight: theme.typography.body.lineHeight
    }),
    motionDuration: theme.motion.overlayDuration,
    enterEasing: theme.motion.enterEasing,
    exitEasing: theme.motion.exitEasing,
    layer: theme.layer.overlay
  });
}
