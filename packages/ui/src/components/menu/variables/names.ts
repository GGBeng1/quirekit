/** Explicit CSS-variable names for the approved Menu component contract. */
export const menuCssVariableNames = Object.freeze({
  typography: Object.freeze({
    fontFamily: "--qk-menu-font-family",
    fontSize: "--qk-menu-font-size",
    lineHeight: "--qk-menu-line-height",
    fontWeight: "--qk-menu-font-weight",
    letterSpacing: "--qk-menu-letter-spacing"
  }),
  metadataTypography: Object.freeze({
    fontFamily: "--qk-menu-metadata-font-family",
    fontSize: "--qk-menu-metadata-font-size",
    lineHeight: "--qk-menu-metadata-line-height"
  }),
  color: Object.freeze({
    surface: "--qk-menu-surface",
    border: "--qk-menu-border",
    separator: "--qk-menu-separator",
    foreground: "--qk-menu-foreground",
    highlightedForeground: "--qk-menu-highlighted-foreground",
    highlightedBackground: "--qk-menu-highlighted-background",
    checkedBackground: "--qk-menu-checked-background",
    metadataForeground: "--qk-menu-metadata-foreground",
    disabledForeground: "--qk-menu-disabled-foreground",
    dangerForeground: "--qk-menu-danger-foreground",
    dangerHighlightedBackground: "--qk-menu-danger-highlighted-background"
  }),
  geometry: Object.freeze({
    contentWidth: "--qk-menu-content-width",
    contentPadding: "--qk-menu-content-padding",
    itemHeight: "--qk-menu-item-height",
    itemPaddingInline: "--qk-menu-item-padding-inline",
    itemGap: "--qk-menu-item-gap",
    iconSize: "--qk-menu-icon-size",
    overlayRadius: "--qk-menu-overlay-radius",
    itemRadius: "--qk-menu-item-radius",
    borderWidth: "--qk-menu-border-width",
    separatorWidth: "--qk-menu-separator-width",
    separatorInset: "--qk-menu-separator-inset",
    groupLabelPaddingBlock: "--qk-menu-group-label-padding-block",
    groupLabelPaddingInline: "--qk-menu-group-label-padding-inline"
  }),
  shadow: "--qk-menu-shadow",
  layer: "--qk-menu-layer",
  feedbackDuration: "--qk-menu-feedback-duration",
  overlayDuration: "--qk-menu-overlay-duration",
  feedbackEasing: "--qk-menu-feedback-easing",
  enterEasing: "--qk-menu-enter-easing",
  exitEasing: "--qk-menu-exit-easing"
} as const);

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Every CSS custom-property name declared by the Menu contract. */
export type QuireKitMenuCssVariableName = NestedStringValue<
  typeof menuCssVariableNames
>;
