/** Explicit CSS-variable names for the Toolbar component contract. */
export const toolbarCssVariableNames = Object.freeze({
  typography: Object.freeze({
    fontFamily: "--qk-toolbar-font-family",
    fontSize: "--qk-toolbar-font-size",
    lineHeight: "--qk-toolbar-line-height",
    fontWeight: "--qk-toolbar-font-weight",
    letterSpacing: "--qk-toolbar-letter-spacing"
  }),
  geometry: Object.freeze({
    itemHeight: "--qk-toolbar-item-height",
    iconSize: "--qk-toolbar-icon-size",
    splitDisclosureWidth: "--qk-toolbar-split-disclosure-width",
    itemPaddingInline: "--qk-toolbar-item-padding-inline",
    itemGap: "--qk-toolbar-item-gap",
    groupGap: "--qk-toolbar-group-gap",
    toolbarGap: "--qk-toolbar-gap",
    itemRadius: "--qk-toolbar-item-radius",
    borderWidth: "--qk-toolbar-border-width",
    separatorWidth: "--qk-toolbar-separator-width",
    separatorInset: "--qk-toolbar-separator-inset"
  }),
  color: Object.freeze({
    surface: "--qk-toolbar-surface",
    foreground: "--qk-toolbar-foreground",
    hoverBackground: "--qk-toolbar-hover-background",
    activeBackground: "--qk-toolbar-active-background",
    selectedBackground: "--qk-toolbar-selected-background",
    focusBorder: "--qk-toolbar-focus-border",
    disabledForeground: "--qk-toolbar-disabled-foreground",
    separator: "--qk-toolbar-separator"
  }),
  feedbackDuration: "--qk-toolbar-feedback-duration",
  feedbackEasing: "--qk-toolbar-feedback-easing"
} as const);

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Every CSS custom-property name declared by the Toolbar contract. */
export type QuireKitToolbarCssVariableName = NestedStringValue<
  typeof toolbarCssVariableNames
>;
