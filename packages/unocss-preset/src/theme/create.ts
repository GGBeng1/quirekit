import {
  buttonVariableReferences,
  menuVariableReferences,
  popoverVariableReferences,
  segmentedVariableReferences,
  type QuireKitSemanticColorTokens,
  type QuireKitThemeVariableReferences
} from "@quirekit/ui";
import type { QuireKitUnoTheme } from "./types";

/**
 * Projects the semantic color contract into flat, enumerable UnoCSS tokens.
 * Every value must already be a reference to an explicitly declared CSS
 * custom property; this compiler does not invent variable names or values.
 *
 * @param color - Complete semantic color-variable reference contract.
 * @returns UnoCSS theme containing the fixed `qk-*` color-token namespace.
 */
export function createUnoTheme(
  tokens: QuireKitThemeVariableReferences
): QuireKitUnoTheme {
  const color: QuireKitSemanticColorTokens = tokens.color;
  const colors = Object.freeze({
    "qk-surface-transparent": color.surface.transparent,
    "qk-surface-workspace": color.surface.workspace,
    "qk-surface-page": color.surface.page,
    "qk-surface-chrome": color.surface.chrome,
    "qk-surface-subtle": color.surface.subtle,
    "qk-surface-raised": color.surface.raised,
    "qk-surface-overlay": color.surface.overlay,
    "qk-surface-inverse": color.surface.inverse,
    "qk-surface-hover": color.surface.hover,
    "qk-surface-pressed": color.surface.pressed,
    "qk-surface-selected": color.surface.selected,
    "qk-surface-disabled": color.surface.disabled,
    "qk-surface-scrim": color.surface.scrim,
    "qk-text-primary": color.text.primary,
    "qk-text-secondary": color.text.secondary,
    "qk-text-tertiary": color.text.tertiary,
    "qk-text-muted": color.text.muted,
    "qk-text-placeholder": color.text.placeholder,
    "qk-text-accent": color.text.accent,
    "qk-text-disabled": color.text.disabled,
    "qk-text-inverse": color.text.inverse,
    "qk-text-on-accent": color.text.onAccent,
    "qk-icon-primary": color.icon.primary,
    "qk-icon-secondary": color.icon.secondary,
    "qk-icon-disabled": color.icon.disabled,
    "qk-icon-on-accent": color.icon.onAccent,
    "qk-border-subtle": color.border.subtle,
    "qk-border-default": color.border.default,
    "qk-border-strong": color.border.strong,
    "qk-border-focus": color.border.focus,
    "qk-border-disabled": color.border.disabled,
    "qk-action-primary": color.action.primary,
    "qk-action-text": color.action.text,
    "qk-action-hover": color.action.hover,
    "qk-action-pressed": color.action.pressed,
    "qk-action-soft": color.action.soft,
    "qk-action-soft-hover": color.action.softHover,
    "qk-action-soft-pressed": color.action.softPressed,
    "qk-action-foreground": color.action.foreground,
    "qk-info-surface": color.info.surface,
    "qk-info-hover-surface": color.info.hoverSurface,
    "qk-info-pressed-surface": color.info.pressedSurface,
    "qk-info-border": color.info.border,
    "qk-info-text": color.info.text,
    "qk-info-foreground": color.info.foreground,
    "qk-info-solid": color.info.solid,
    "qk-info-on-solid": color.info.onSolid,
    "qk-success-surface": color.success.surface,
    "qk-success-hover-surface": color.success.hoverSurface,
    "qk-success-pressed-surface": color.success.pressedSurface,
    "qk-success-border": color.success.border,
    "qk-success-text": color.success.text,
    "qk-success-foreground": color.success.foreground,
    "qk-success-solid": color.success.solid,
    "qk-success-on-solid": color.success.onSolid,
    "qk-warning-surface": color.warning.surface,
    "qk-warning-hover-surface": color.warning.hoverSurface,
    "qk-warning-pressed-surface": color.warning.pressedSurface,
    "qk-warning-border": color.warning.border,
    "qk-warning-text": color.warning.text,
    "qk-warning-foreground": color.warning.foreground,
    "qk-warning-solid": color.warning.solid,
    "qk-warning-on-solid": color.warning.onSolid,
    "qk-danger-surface": color.danger.surface,
    "qk-danger-hover-surface": color.danger.hoverSurface,
    "qk-danger-pressed-surface": color.danger.pressedSurface,
    "qk-danger-border": color.danger.border,
    "qk-danger-text": color.danger.text,
    "qk-danger-foreground": color.danger.foreground,
    "qk-danger-solid": color.danger.solid,
    "qk-danger-on-solid": color.danger.onSolid,
    "qk-selection-document": color.selection.document,
    "qk-selection-remote": color.selection.remote,
    "qk-selection-drop-target": color.selection.dropTarget,
    "qk-button-focus": buttonVariableReferences.focusColor,
    ...buttonColorTokens("neutral", buttonVariableReferences.color.neutral),
    ...buttonColorTokens("primary", buttonVariableReferences.color.primary),
    ...buttonColorTokens("info", buttonVariableReferences.color.info),
    ...buttonColorTokens("success", buttonVariableReferences.color.success),
    ...buttonColorTokens("warning", buttonVariableReferences.color.warning),
    ...buttonColorTokens("danger", buttonVariableReferences.color.danger),
    "qk-button-disabled-foreground": buttonVariableReferences.disabled.foreground,
    "qk-button-disabled-background": buttonVariableReferences.disabled.background,
    "qk-button-disabled-border": buttonVariableReferences.disabled.borderColor,
    "qk-menu-surface": menuVariableReferences.color.surface,
    "qk-menu-border": menuVariableReferences.color.border,
    "qk-menu-separator": menuVariableReferences.color.separator,
    "qk-menu-foreground": menuVariableReferences.color.foreground,
    "qk-menu-highlighted-foreground": menuVariableReferences.color.highlightedForeground,
    "qk-menu-highlighted-background": menuVariableReferences.color.highlightedBackground,
    "qk-menu-checked-background": menuVariableReferences.color.checkedBackground,
    "qk-menu-metadata-foreground": menuVariableReferences.color.metadataForeground,
    "qk-menu-disabled-foreground": menuVariableReferences.color.disabledForeground,
    "qk-menu-danger-foreground": menuVariableReferences.color.dangerForeground,
    "qk-menu-danger-highlighted-background": menuVariableReferences.color.dangerHighlightedBackground,
    "qk-popover-focus": popoverVariableReferences.focusColor,
    "qk-popover-close-hover": popoverVariableReferences.closeHoverBackground,
    "qk-segmented-track-background": segmentedVariableReferences.trackBackground,
    "qk-segmented-foreground": segmentedVariableReferences.foreground,
    "qk-segmented-hover-foreground": segmentedVariableReferences.hoverForeground,
    "qk-segmented-hover-background": segmentedVariableReferences.hoverBackground,
    "qk-segmented-selected-foreground": segmentedVariableReferences.selectedForeground,
    "qk-segmented-selected-background": segmentedVariableReferences.selectedBackground,
    "qk-segmented-disabled-foreground": segmentedVariableReferences.disabledForeground,
    "qk-segmented-focus": segmentedVariableReferences.focusColor
  });

  const type = tokens.typography;
  return Object.freeze({
    colors,
    spacing: Object.freeze({
      "qk-inline-tight": tokens.spacing.inlineTight, "qk-inline": tokens.spacing.inline,
      "qk-surface-compact": tokens.spacing.surfaceCompact, "qk-surface": tokens.spacing.surface,
      "qk-group": tokens.spacing.group, "qk-section": tokens.spacing.section,
      "qk-page": tokens.spacing.page, "qk-major": tokens.spacing.major,
      "qk-control-compact": tokens.control.compact,
      "qk-control-default": tokens.control.default,
      "qk-control-regular": tokens.control.regular,
      "qk-control-comfortable": tokens.control.comfortable,
      "qk-control-large": tokens.control.large,
      "qk-touch-target": tokens.control.touchTarget,
      "qk-button-xs-inline": buttonVariableReferences.size.xs.paddingInline,
      "qk-button-sm-inline": buttonVariableReferences.size.sm.paddingInline,
      "qk-button-md-inline": buttonVariableReferences.size.md.paddingInline,
      "qk-button-lg-inline": buttonVariableReferences.size.lg.paddingInline,
      "qk-button-xl-inline": buttonVariableReferences.size.xl.paddingInline,
      "qk-button-xs-gap": buttonVariableReferences.size.xs.gap,
      "qk-button-sm-gap": buttonVariableReferences.size.sm.gap,
      "qk-button-md-gap": buttonVariableReferences.size.md.gap,
      "qk-button-lg-gap": buttonVariableReferences.size.lg.gap,
      "qk-button-xl-gap": buttonVariableReferences.size.xl.gap,
      "qk-menu-content": menuVariableReferences.geometry.contentPadding,
      "qk-menu-item": menuVariableReferences.geometry.itemPaddingInline,
      "qk-menu-item-gap": menuVariableReferences.geometry.itemGap,
      "qk-menu-icon": menuVariableReferences.geometry.iconSize,
      "qk-menu-separator-inset": menuVariableReferences.geometry.separatorInset,
      "qk-menu-group-label-block": menuVariableReferences.geometry.groupLabelPaddingBlock,
      "qk-menu-group-label-inline": menuVariableReferences.geometry.groupLabelPaddingInline,
      "qk-segmented-track-inset": segmentedVariableReferences.trackInset,
      ...segmentedSizeField("inline", "paddingInline"),
      ...segmentedSizeField("gap", "gap")
    }),
    borderRadius: Object.freeze({
      ...prefixFlat("qk", tokens.radius),
      "qk-button-xs": buttonVariableReferences.size.xs.radius,
      "qk-button-sm": buttonVariableReferences.size.sm.radius,
      "qk-button-md": buttonVariableReferences.size.md.radius,
      "qk-button-lg": buttonVariableReferences.size.lg.radius,
      "qk-button-xl": buttonVariableReferences.size.xl.radius,
      "qk-menu-overlay": menuVariableReferences.geometry.overlayRadius,
      "qk-menu-item": menuVariableReferences.geometry.itemRadius,
      "qk-segmented-track": segmentedVariableReferences.trackRadius,
      "qk-segmented-indicator": segmentedVariableReferences.indicatorRadius
    }),
    lineWidth: Object.freeze({ ...prefixFlat("qk", tokens.borderWidth), "qk-button-width": buttonVariableReferences.borderWidth, "qk-menu": menuVariableReferences.geometry.borderWidth, "qk-menu-separator": menuVariableReferences.geometry.separatorWidth }),
    boxShadow: Object.freeze({ ...prefixFlat("qk", tokens.elevation), "qk-menu": menuVariableReferences.shadow }),
    fontFamily: Object.freeze({ "qk-product": type.body.fontFamily, "qk-mono": type.code.fontFamily, "qk-button-family": buttonVariableReferences.typography.fontFamily, "qk-menu": menuVariableReferences.typography.fontFamily, "qk-menu-metadata": menuVariableReferences.metadataTypography.fontFamily, "qk-segmented-family": segmentedVariableReferences.typography.fontFamily }),
    fontSize: Object.freeze({ ...typeSizeField(type), "qk-button-xs": buttonVariableReferences.size.xs.fontSize, "qk-button-sm": buttonVariableReferences.size.sm.fontSize, "qk-button-md": buttonVariableReferences.size.md.fontSize, "qk-button-lg": buttonVariableReferences.size.lg.fontSize, "qk-button-xl": buttonVariableReferences.size.xl.fontSize, "qk-menu": menuVariableReferences.typography.fontSize, "qk-menu-metadata": menuVariableReferences.metadataTypography.fontSize, ...segmentedSizeField("font", "fontSize") }),
    lineHeight: Object.freeze({ ...typeField(type, "lineHeight"), "qk-button-xs": buttonVariableReferences.size.xs.lineHeight, "qk-button-sm": buttonVariableReferences.size.sm.lineHeight, "qk-button-md": buttonVariableReferences.size.md.lineHeight, "qk-button-lg": buttonVariableReferences.size.lg.lineHeight, "qk-button-xl": buttonVariableReferences.size.xl.lineHeight, "qk-menu": menuVariableReferences.typography.lineHeight, "qk-menu-metadata": menuVariableReferences.metadataTypography.lineHeight, ...segmentedSizeField("line", "lineHeight") }),
    fontWeight: Object.freeze({ ...typeField(type, "fontWeight"), "qk-button-weight": buttonVariableReferences.typography.fontWeight, "qk-menu-weight": menuVariableReferences.typography.fontWeight, "qk-menu-metadata-weight": type.helper.fontWeight, "qk-segmented-weight": segmentedVariableReferences.typography.fontWeight }),
    letterSpacing: Object.freeze({ ...typeField(type, "letterSpacing"), "qk-button": buttonVariableReferences.typography.letterSpacing, "qk-menu": menuVariableReferences.typography.letterSpacing, "qk-segmented": segmentedVariableReferences.typography.letterSpacing }),
    height: Object.freeze({ "qk-control-compact": tokens.control.compact, "qk-control-default": tokens.control.default, "qk-control-regular": tokens.control.regular, "qk-control-comfortable": tokens.control.comfortable, "qk-control-large": tokens.control.large, "qk-icon": tokens.control.icon, "qk-icon-large": tokens.control.iconLarge, "qk-touch-target": tokens.control.touchTarget, "qk-button-xs": buttonVariableReferences.size.xs.height, "qk-button-sm": buttonVariableReferences.size.sm.height, "qk-button-md": buttonVariableReferences.size.md.height, "qk-button-lg": buttonVariableReferences.size.lg.height, "qk-button-xl": buttonVariableReferences.size.xl.height, "qk-button-xs-icon": buttonVariableReferences.size.xs.iconSize, "qk-button-sm-icon": buttonVariableReferences.size.sm.iconSize, "qk-button-md-icon": buttonVariableReferences.size.md.iconSize, "qk-button-lg-icon": buttonVariableReferences.size.lg.iconSize, "qk-button-xl-icon": buttonVariableReferences.size.xl.iconSize, "qk-menu-item": menuVariableReferences.geometry.itemHeight, "qk-menu-icon": menuVariableReferences.geometry.iconSize, "qk-menu-separator": menuVariableReferences.geometry.separatorWidth, ...segmentedSizeField("height", "height") }),
    width: Object.freeze({ "qk-icon": tokens.control.icon, "qk-icon-large": tokens.control.iconLarge, "qk-touch-target": tokens.control.touchTarget, "qk-button-xs": buttonVariableReferences.size.xs.height, "qk-button-sm": buttonVariableReferences.size.sm.height, "qk-button-md": buttonVariableReferences.size.md.height, "qk-button-lg": buttonVariableReferences.size.lg.height, "qk-button-xl": buttonVariableReferences.size.xl.height, "qk-button-xs-icon": buttonVariableReferences.size.xs.iconSize, "qk-button-sm-icon": buttonVariableReferences.size.sm.iconSize, "qk-button-md-icon": buttonVariableReferences.size.md.iconSize, "qk-button-lg-icon": buttonVariableReferences.size.lg.iconSize, "qk-button-xl-icon": buttonVariableReferences.size.xl.iconSize, "qk-menu-icon": menuVariableReferences.geometry.iconSize }),
    opacity: prefixFlat("qk", tokens.opacity),
    zIndex: Object.freeze({ ...prefixFlat("qk", tokens.layer), "qk-menu": menuVariableReferences.layer }),
    duration: Object.freeze({ "qk-feedback": tokens.motion.feedbackDuration, "qk-control": tokens.motion.controlDuration, "qk-overlay": tokens.motion.overlayDuration, "qk-button-feedback": buttonVariableReferences.feedbackDuration, "qk-menu-feedback": menuVariableReferences.feedbackDuration, "qk-menu-overlay": menuVariableReferences.overlayDuration, "qk-segmented": segmentedVariableReferences.transitionDuration }),
    easing: Object.freeze({ "qk-standard": tokens.motion.standardEasing, "qk-enter": tokens.motion.enterEasing, "qk-exit": tokens.motion.exitEasing, "qk-button-feedback": buttonVariableReferences.feedbackEasing, "qk-menu-feedback": menuVariableReferences.feedbackEasing, "qk-menu-enter": menuVariableReferences.enterEasing, "qk-menu-exit": menuVariableReferences.exitEasing, "qk-segmented": segmentedVariableReferences.transitionEasing })
  });
}

/**
 * Projects one Segmented size field into the utility name consumed by its recipe.
 *
 * @param kind - Utility family that determines whether the size name needs a suffix.
 * @param field - Component-token field projected into that utility family.
 * @returns Five public size entries backed by explicit Segmented CSS variables.
 */
function segmentedSizeField(
  kind: "inline" | "gap" | "height" | "font" | "line",
  field: "paddingInline" | "gap" | "height" | "fontSize" | "lineHeight"
): Readonly<Record<string, string>> {
  const suffix = kind === "inline" ? "-inline" : kind === "gap" ? "-gap" : "";
  return Object.freeze(Object.fromEntries(
    (["xs", "sm", "md", "lg", "xl"] as const).map((size) => [
      `qk-segmented-${size}${suffix}`,
      segmentedVariableReferences.size[size][field]
    ])
  ));
}

/**
 * Projects one complete Button color family into enumerable UnoCSS color tokens.
 *
 * @param color - Public color name used by the utility namespace.
 * @param value - CSS-variable references for that component color.
 * @returns Flat UnoCSS color-token entries.
 */
function buttonColorTokens(
  color: "neutral" | "primary" | "info" | "success" | "warning" | "danger",
  value: typeof buttonVariableReferences.color.neutral
): Readonly<Record<string, string>> {
  return Object.freeze({
    [`qk-button-${color}-foreground`]: value.foreground,
    [`qk-button-${color}-solid-foreground`]: value.solidForeground,
    [`qk-button-${color}-solid-background`]: value.solidBackground,
    [`qk-button-${color}-solid-hover-background`]: value.solidHoverBackground,
    [`qk-button-${color}-solid-pressed-background`]: value.solidPressedBackground,
    [`qk-button-${color}-soft-background`]: value.softBackground,
    [`qk-button-${color}-soft-hover-background`]: value.softHoverBackground,
    [`qk-button-${color}-soft-pressed-background`]: value.softPressedBackground,
    [`qk-button-${color}-border`]: value.borderColor
  });
}

/** @param prefix - Stable token prefix. @param values - Flat semantic values. @returns Prefixed UnoCSS theme values. */
function prefixFlat(prefix: string, values: Readonly<Record<string, string | number>>): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}-${key}`, String(value)])));
}

/**
 * Projects one typography field into enumerable role names.
 *
 * @param roles - Semantic typography roles.
 * @param field - Typography field to project.
 * @returns Flat UnoCSS typography theme values.
 */
function typeField(roles: QuireKitThemeVariableReferences["typography"], field: "fontSize" | "lineHeight" | "fontWeight" | "letterSpacing"): Readonly<Record<string, string>> {
  const entries = Object.entries(roles) as Array<[string, QuireKitThemeVariableReferences["typography"][keyof QuireKitThemeVariableReferences["typography"]]]>;
  return Object.freeze(Object.fromEntries(entries.map(([role, value]) => [`qk-${kebab(role)}`, String(value[field])]))) as Readonly<Record<string, string>>;
}

/**
 * Projects every semantic typography role as an inseparable size/line-height pair.
 *
 * UnoCSS emits both declarations for `text-qk-*`, so multiline copy cannot fall
 * back to the browser's unrelated default line height when a page omits a
 * separate `leading-qk-*` utility.
 *
 * @param roles - Semantic typography roles.
 * @returns Role names paired with their approved font size and line height.
 */
function typeSizeField(
  roles: QuireKitThemeVariableReferences["typography"]
): Readonly<Record<string, [string, string]>> {
  const entries = Object.entries(roles) as Array<[
    string,
    QuireKitThemeVariableReferences["typography"][keyof QuireKitThemeVariableReferences["typography"]]
  ]>;
  return Object.freeze(Object.fromEntries(entries.map(([role, value]) => [
    `qk-${kebab(role)}`,
    [value.fontSize, value.lineHeight]
  ]))) as Readonly<Record<string, [string, string]>>;
}

/** @param value - Camel-case semantic role. @returns Kebab-case UnoCSS token name. */
function kebab(value: string): string {
  return value.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`);
}
