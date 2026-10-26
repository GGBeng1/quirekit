/** Tooltip 组件合同的显式 CSS 变量名。 */
export const tooltipCssVariableNames = Object.freeze({
  background: "--qk-tooltip-background",
  foreground: "--qk-tooltip-foreground",
  borderColor: "--qk-tooltip-border-color",
  borderWidth: "--qk-tooltip-border-width",
  radius: "--qk-tooltip-radius",
  shadow: "--qk-tooltip-shadow",
  paddingBlock: "--qk-tooltip-padding-block",
  paddingInline: "--qk-tooltip-padding-inline",
  gap: "--qk-tooltip-gap",
  arrowSize: "--qk-tooltip-arrow-size",
  typography: Object.freeze({
    fontFamily: "--qk-tooltip-font-family",
    fontSize: "--qk-tooltip-font-size",
    lineHeight: "--qk-tooltip-line-height",
    fontWeight: "--qk-tooltip-font-weight",
    letterSpacing: "--qk-tooltip-letter-spacing"
  }),
  motionDuration: "--qk-tooltip-motion-duration",
  enterEasing: "--qk-tooltip-enter-easing",
  exitEasing: "--qk-tooltip-exit-easing",
  layer: "--qk-tooltip-layer"
} as const);

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Tooltip 合同声明的全部 CSS 自定义属性名。 */
export type QuireKitTooltipCssVariableName = NestedStringValue<
  typeof tooltipCssVariableNames
>;
