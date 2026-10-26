/** Popover 组件合同的显式 CSS 变量名。 */
export const popoverCssVariableNames = Object.freeze({
  background: "--qk-popover-background",
  foreground: "--qk-popover-foreground",
  mutedForeground: "--qk-popover-muted-foreground",
  borderColor: "--qk-popover-border-color",
  borderWidth: "--qk-popover-border-width",
  radius: "--qk-popover-radius",
  shadow: "--qk-popover-shadow",
  padding: "--qk-popover-padding",
  gap: "--qk-popover-gap",
  arrowSize: "--qk-popover-arrow-size",
  closeSize: "--qk-popover-close-size",
  closeRadius: "--qk-popover-close-radius",
  closeHoverBackground: "--qk-popover-close-hover-background",
  closeForeground: "--qk-popover-close-foreground",
  focusColor: "--qk-popover-focus-color",
  fontFamily: "--qk-popover-font-family",
  title: Object.freeze({
    fontSize: "--qk-popover-title-font-size",
    lineHeight: "--qk-popover-title-line-height",
    fontWeight: "--qk-popover-title-font-weight",
    letterSpacing: "--qk-popover-title-letter-spacing"
  }),
  body: Object.freeze({
    fontSize: "--qk-popover-body-font-size",
    lineHeight: "--qk-popover-body-line-height"
  }),
  motionDuration: "--qk-popover-motion-duration",
  enterEasing: "--qk-popover-enter-easing",
  exitEasing: "--qk-popover-exit-easing",
  layer: "--qk-popover-layer"
} as const);

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Popover 合同声明的全部 CSS 自定义属性名。 */
export type QuireKitPopoverCssVariableName = NestedStringValue<
  typeof popoverCssVariableNames
>;
