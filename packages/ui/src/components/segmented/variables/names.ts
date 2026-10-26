/** Segmented Control 获准组件合同的显式 CSS 变量名。 */
export const segmentedCssVariableNames = Object.freeze({
  typography: Object.freeze({
    fontFamily: "--qk-segmented-font-family",
    fontWeight: "--qk-segmented-font-weight",
    letterSpacing: "--qk-segmented-letter-spacing"
  }),
  size: Object.freeze({
    xs: sizeNames("xs"),
    sm: sizeNames("sm"),
    md: sizeNames("md"),
    lg: sizeNames("lg"),
    xl: sizeNames("xl")
  }),
  trackInset: "--qk-segmented-track-inset",
  trackRadius: "--qk-segmented-track-radius",
  indicatorRadius: "--qk-segmented-indicator-radius",
  trackBackground: "--qk-segmented-track-background",
  foreground: "--qk-segmented-foreground",
  hoverForeground: "--qk-segmented-hover-foreground",
  hoverBackground: "--qk-segmented-hover-background",
  selectedForeground: "--qk-segmented-selected-foreground",
  selectedBackground: "--qk-segmented-selected-background",
  disabledForeground: "--qk-segmented-disabled-foreground",
  focusColor: "--qk-segmented-focus-color",
  transitionDuration: "--qk-segmented-transition-duration",
  transitionEasing: "--qk-segmented-transition-easing"
} as const);

/**
 * 声明一个公开尺寸拥有的固定变量字段。
 *
 * @param size - 写入每个变量名的公开尺寸。
 * @returns 当前尺寸的显式变量名组。
 */
function sizeNames(size: "xs" | "sm" | "md" | "lg" | "xl") {
  return Object.freeze({
    height: `--qk-segmented-${size}-height`,
    paddingInline: `--qk-segmented-${size}-padding-inline`,
    gap: `--qk-segmented-${size}-gap`,
    iconSize: `--qk-segmented-${size}-icon-size`,
    fontSize: `--qk-segmented-${size}-font-size`,
    lineHeight: `--qk-segmented-${size}-line-height`
  } as const);
}

type NestedStringValue<T> = T extends string
  ? T
  : { readonly [Key in keyof T]: NestedStringValue<T[Key]> }[keyof T];

/** Segmented Control 合同声明的全部 CSS 自定义属性名。 */
export type QuireKitSegmentedCssVariableName = NestedStringValue<
  typeof segmentedCssVariableNames
>;
