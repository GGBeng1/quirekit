import { segmentedCssVariableNames } from "./names";

/** Segmented Control 全部组件 token 的 CSS 引用投影。 */
export const segmentedVariableReferences = Object.freeze({
  typography: mapReferences(segmentedCssVariableNames.typography),
  size: Object.freeze({
    xs: mapReferences(segmentedCssVariableNames.size.xs),
    sm: mapReferences(segmentedCssVariableNames.size.sm),
    md: mapReferences(segmentedCssVariableNames.size.md),
    lg: mapReferences(segmentedCssVariableNames.size.lg),
    xl: mapReferences(segmentedCssVariableNames.size.xl)
  }),
  trackInset: reference(segmentedCssVariableNames.trackInset),
  trackRadius: reference(segmentedCssVariableNames.trackRadius),
  indicatorRadius: reference(segmentedCssVariableNames.indicatorRadius),
  trackBackground: reference(segmentedCssVariableNames.trackBackground),
  foreground: reference(segmentedCssVariableNames.foreground),
  hoverForeground: reference(segmentedCssVariableNames.hoverForeground),
  hoverBackground: reference(segmentedCssVariableNames.hoverBackground),
  selectedForeground: reference(segmentedCssVariableNames.selectedForeground),
  selectedBackground: reference(segmentedCssVariableNames.selectedBackground),
  disabledForeground: reference(segmentedCssVariableNames.disabledForeground),
  focusColor: reference(segmentedCssVariableNames.focusColor),
  transitionDuration: reference(segmentedCssVariableNames.transitionDuration),
  transitionEasing: reference(segmentedCssVariableNames.transitionEasing)
});

/**
 * 创建一个已显式声明组件变量的 CSS 引用。
 *
 * @param name - 已声明的 CSS 自定义属性名。
 * @returns CSS 变量引用。
 */
function reference(name: string): string {
  return `var(${name})`;
}

/**
 * 把显式变量名组投影为相同结构的 CSS 引用。
 *
 * @param names - 已批准的变量名组。
 * @returns 与输入同结构的 CSS 引用。
 */
function mapReferences<T extends Readonly<Record<string, string>>>(
  names: T
): { readonly [Key in keyof T]: string } {
  return Object.freeze(
    Object.fromEntries(
      Object.entries(names).map(([key, name]) => [key, reference(name)])
    )
  ) as { readonly [Key in keyof T]: string };
}
