/** Explicit CSS-variable contract for the approved semantic color layer. */
export const themeCssVariableNames = Object.freeze({
  color: Object.freeze({
    surface: Object.freeze({
      transparent: "--qk-color-surface-transparent",
      workspace: "--qk-color-surface-workspace",
      page: "--qk-color-surface-page",
      chrome: "--qk-color-surface-chrome",
      subtle: "--qk-color-surface-subtle",
      raised: "--qk-color-surface-raised",
      overlay: "--qk-color-surface-overlay",
      inverse: "--qk-color-surface-inverse",
      hover: "--qk-color-surface-hover",
      pressed: "--qk-color-surface-pressed",
      selected: "--qk-color-surface-selected",
      disabled: "--qk-color-surface-disabled",
      scrim: "--qk-color-surface-scrim"
    }),
    text: Object.freeze({
      primary: "--qk-color-text-primary",
      secondary: "--qk-color-text-secondary",
      tertiary: "--qk-color-text-tertiary",
      muted: "--qk-color-text-muted",
      placeholder: "--qk-color-text-placeholder",
      accent: "--qk-color-text-accent",
      disabled: "--qk-color-text-disabled",
      inverse: "--qk-color-text-inverse",
      onAccent: "--qk-color-text-on-accent"
    }),
    icon: Object.freeze({
      primary: "--qk-color-icon-primary",
      secondary: "--qk-color-icon-secondary",
      disabled: "--qk-color-icon-disabled",
      onAccent: "--qk-color-icon-on-accent"
    }),
    border: Object.freeze({
      subtle: "--qk-color-border-subtle",
      default: "--qk-color-border-default",
      strong: "--qk-color-border-strong",
      focus: "--qk-color-border-focus",
      disabled: "--qk-color-border-disabled"
    }),
    action: Object.freeze({
      primary: "--qk-color-action-primary",
      text: "--qk-color-action-text",
      hover: "--qk-color-action-hover",
      pressed: "--qk-color-action-pressed",
      soft: "--qk-color-action-soft",
      softHover: "--qk-color-action-soft-hover",
      softPressed: "--qk-color-action-soft-pressed",
      foreground: "--qk-color-action-foreground"
    }),
    info: Object.freeze({
      surface: "--qk-color-info-surface",
      hoverSurface: "--qk-color-info-hover-surface",
      pressedSurface: "--qk-color-info-pressed-surface",
      border: "--qk-color-info-border",
      text: "--qk-color-info-text",
      foreground: "--qk-color-info-foreground",
      solid: "--qk-color-info-solid",
      onSolid: "--qk-color-info-on-solid"
    }),
    success: Object.freeze({
      surface: "--qk-color-success-surface",
      hoverSurface: "--qk-color-success-hover-surface",
      pressedSurface: "--qk-color-success-pressed-surface",
      border: "--qk-color-success-border",
      text: "--qk-color-success-text",
      foreground: "--qk-color-success-foreground",
      solid: "--qk-color-success-solid",
      onSolid: "--qk-color-success-on-solid"
    }),
    warning: Object.freeze({
      surface: "--qk-color-warning-surface",
      hoverSurface: "--qk-color-warning-hover-surface",
      pressedSurface: "--qk-color-warning-pressed-surface",
      border: "--qk-color-warning-border",
      text: "--qk-color-warning-text",
      foreground: "--qk-color-warning-foreground",
      solid: "--qk-color-warning-solid",
      onSolid: "--qk-color-warning-on-solid"
    }),
    danger: Object.freeze({
      surface: "--qk-color-danger-surface",
      hoverSurface: "--qk-color-danger-hover-surface",
      pressedSurface: "--qk-color-danger-pressed-surface",
      border: "--qk-color-danger-border",
      text: "--qk-color-danger-text",
      foreground: "--qk-color-danger-foreground",
      solid: "--qk-color-danger-solid",
      onSolid: "--qk-color-danger-on-solid"
    }),
    selection: Object.freeze({
      document: "--qk-color-selection-document",
      remote: "--qk-color-selection-remote",
      dropTarget: "--qk-color-selection-drop-target"
    })
  }),
  typography: Object.freeze({
    display: Object.freeze({
      fontFamily: "--qk-type-display-font-family",
      fontSize: "--qk-type-display-font-size",
      lineHeight: "--qk-type-display-line-height",
      fontWeight: "--qk-type-display-font-weight",
      letterSpacing: "--qk-type-display-letter-spacing"
    }),
    pageTitle: Object.freeze({
      fontFamily: "--qk-type-page-title-font-family",
      fontSize: "--qk-type-page-title-font-size",
      lineHeight: "--qk-type-page-title-line-height",
      fontWeight: "--qk-type-page-title-font-weight",
      letterSpacing: "--qk-type-page-title-letter-spacing"
    }),
    sectionTitle: Object.freeze({
      fontFamily: "--qk-type-section-title-font-family",
      fontSize: "--qk-type-section-title-font-size",
      lineHeight: "--qk-type-section-title-line-height",
      fontWeight: "--qk-type-section-title-font-weight",
      letterSpacing: "--qk-type-section-title-letter-spacing"
    }),
    heading: Object.freeze({
      fontFamily: "--qk-type-heading-font-family",
      fontSize: "--qk-type-heading-font-size",
      lineHeight: "--qk-type-heading-line-height",
      fontWeight: "--qk-type-heading-font-weight",
      letterSpacing: "--qk-type-heading-letter-spacing"
    }),
    body: Object.freeze({
      fontFamily: "--qk-type-body-font-family",
      fontSize: "--qk-type-body-font-size",
      lineHeight: "--qk-type-body-line-height",
      fontWeight: "--qk-type-body-font-weight",
      letterSpacing: "--qk-type-body-letter-spacing"
    }),
    control: Object.freeze({
      fontFamily: "--qk-type-control-font-family",
      fontSize: "--qk-type-control-font-size",
      lineHeight: "--qk-type-control-line-height",
      fontWeight: "--qk-type-control-font-weight",
      letterSpacing: "--qk-type-control-letter-spacing"
    }),
    compact: Object.freeze({
      fontFamily: "--qk-type-compact-font-family",
      fontSize: "--qk-type-compact-font-size",
      lineHeight: "--qk-type-compact-line-height",
      fontWeight: "--qk-type-compact-font-weight",
      letterSpacing: "--qk-type-compact-letter-spacing"
    }),
    helper: Object.freeze({
      fontFamily: "--qk-type-helper-font-family",
      fontSize: "--qk-type-helper-font-size",
      lineHeight: "--qk-type-helper-line-height",
      fontWeight: "--qk-type-helper-font-weight",
      letterSpacing: "--qk-type-helper-letter-spacing"
    }),
    code: Object.freeze({
      fontFamily: "--qk-type-code-font-family",
      fontSize: "--qk-type-code-font-size",
      lineHeight: "--qk-type-code-line-height",
      fontWeight: "--qk-type-code-font-weight",
      letterSpacing: "--qk-type-code-letter-spacing"
    })
  }),
  spacing: Object.freeze({
    inlineTight: "--qk-space-inline-tight", inline: "--qk-space-inline",
    surfaceCompact: "--qk-space-surface-compact", surface: "--qk-space-surface",
    group: "--qk-space-group", section: "--qk-space-section",
    page: "--qk-space-page", major: "--qk-space-major"
  }),
  radius: Object.freeze({
    page: "--qk-radius-page", control: "--qk-radius-control", group: "--qk-radius-group",
    overlay: "--qk-radius-overlay", dialog: "--qk-radius-dialog", pill: "--qk-radius-pill"
  }),
  borderWidth: Object.freeze({ none: "--qk-border-width-none", default: "--qk-border-width-default", focus: "--qk-border-width-focus" }),
  elevation: Object.freeze({ flat: "--qk-elevation-flat", raised: "--qk-elevation-raised", overlay: "--qk-elevation-overlay", modal: "--qk-elevation-modal" }),
  motion: Object.freeze({
    feedbackDuration: "--qk-motion-feedback-duration", controlDuration: "--qk-motion-control-duration", overlayDuration: "--qk-motion-overlay-duration",
    standardEasing: "--qk-motion-standard-easing", enterEasing: "--qk-motion-enter-easing", exitEasing: "--qk-motion-exit-easing"
  }),
  opacity: Object.freeze({ transparent: "--qk-opacity-transparent", disabled: "--qk-opacity-disabled", muted: "--qk-opacity-muted", drag: "--qk-opacity-drag", pressed: "--qk-opacity-pressed", hover: "--qk-opacity-hover", opaque: "--qk-opacity-opaque" }),
  layer: Object.freeze({ base: "--qk-layer-base", chrome: "--qk-layer-chrome", overlay: "--qk-layer-overlay", modal: "--qk-layer-modal", toast: "--qk-layer-toast", tooltip: "--qk-layer-tooltip" }),
  control: Object.freeze({ compact: "--qk-control-compact", default: "--qk-control-default", regular: "--qk-control-regular", comfortable: "--qk-control-comfortable", large: "--qk-control-large", icon: "--qk-control-icon", iconLarge: "--qk-control-icon-large", touchTarget: "--qk-control-touch-target" })
} as const);

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Every CSS custom-property name declared by the semantic theme contract. */
export type QuireKitThemeCssVariableName = NestedStringValue<
  typeof themeCssVariableNames
>;
