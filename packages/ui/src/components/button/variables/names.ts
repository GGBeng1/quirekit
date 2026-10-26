/** Explicit CSS-variable names for the approved Button component contract. */
export const buttonCssVariableNames = Object.freeze({
  typography: Object.freeze({
    fontFamily: "--qk-button-font-family",
    fontWeight: "--qk-button-font-weight",
    letterSpacing: "--qk-button-letter-spacing"
  }),
  size: Object.freeze({
    xs: sizeNames("xs"),
    sm: sizeNames("sm"),
    md: sizeNames("md"),
    lg: sizeNames("lg"),
    xl: sizeNames("xl")
  }),
  color: Object.freeze({
    neutral: colorNames("neutral"),
    primary: colorNames("primary"),
    info: colorNames("info"),
    success: colorNames("success"),
    warning: colorNames("warning"),
    danger: colorNames("danger")
  }),
  disabled: Object.freeze({
    foreground: "--qk-button-disabled-foreground",
    background: "--qk-button-disabled-background",
    borderColor: "--qk-button-disabled-border-color"
  }),
  borderWidth: "--qk-button-border-width",
  focusColor: "--qk-button-focus-color",
  hoverOpacity: "--qk-button-hover-opacity",
  pressedOpacity: "--qk-button-pressed-opacity",
  feedbackDuration: "--qk-button-feedback-duration",
  feedbackEasing: "--qk-button-feedback-easing"
} as const);

/**
 * Declares the fixed CSS-variable fields owned by one public size.
 *
 * @param size - Public size name included in every declared variable.
 * @returns Explicit variable-name group for that size.
 */
function sizeNames(size: "xs" | "sm" | "md" | "lg" | "xl") {
  return Object.freeze({
    height: `--qk-button-${size}-height`,
    paddingInline: `--qk-button-${size}-padding-inline`,
    gap: `--qk-button-${size}-gap`,
    iconSize: `--qk-button-${size}-icon-size`,
    radius: `--qk-button-${size}-radius`,
    fontSize: `--qk-button-${size}-font-size`,
    lineHeight: `--qk-button-${size}-line-height`
  } as const);
}

/**
 * Declares the fixed CSS-variable fields owned by one semantic color family.
 *
 * @param color - Public semantic color included in every declared variable.
 * @returns Explicit variable-name group for that color.
 */
function colorNames(
  color: "neutral" | "primary" | "info" | "success" | "warning" | "danger"
) {
  return Object.freeze({
    foreground: `--qk-button-${color}-foreground`,
    solidForeground: `--qk-button-${color}-solid-foreground`,
    solidBackground: `--qk-button-${color}-solid-background`,
    solidHoverBackground: `--qk-button-${color}-solid-hover-background`,
    solidPressedBackground: `--qk-button-${color}-solid-pressed-background`,
    softBackground: `--qk-button-${color}-soft-background`,
    softHoverBackground: `--qk-button-${color}-soft-hover-background`,
    softPressedBackground: `--qk-button-${color}-soft-pressed-background`,
    borderColor: `--qk-button-${color}-border-color`
  } as const);
}

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Every CSS custom-property name declared by the Button contract. */
export type QuireKitButtonCssVariableName = NestedStringValue<
  typeof buttonCssVariableNames
>;
