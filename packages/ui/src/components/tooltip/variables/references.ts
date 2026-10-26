import { tooltipCssVariableNames } from "./names";

/** Tooltip 组件 token 的 CSS 引用投影。 */
export const tooltipVariableReferences = Object.freeze({
  background: reference(tooltipCssVariableNames.background),
  foreground: reference(tooltipCssVariableNames.foreground),
  borderColor: reference(tooltipCssVariableNames.borderColor),
  borderWidth: reference(tooltipCssVariableNames.borderWidth),
  radius: reference(tooltipCssVariableNames.radius),
  shadow: reference(tooltipCssVariableNames.shadow),
  paddingBlock: reference(tooltipCssVariableNames.paddingBlock),
  paddingInline: reference(tooltipCssVariableNames.paddingInline),
  gap: reference(tooltipCssVariableNames.gap),
  arrowSize: reference(tooltipCssVariableNames.arrowSize),
  typography: mapReferences(tooltipCssVariableNames.typography),
  motionDuration: reference(tooltipCssVariableNames.motionDuration),
  enterEasing: reference(tooltipCssVariableNames.enterEasing),
  exitEasing: reference(tooltipCssVariableNames.exitEasing),
  layer: reference(tooltipCssVariableNames.layer)
});

/**
 * 创建对一个显式组件变量的 CSS 引用。
 *
 * @param name - 已声明的 CSS 自定义属性名。
 * @returns CSS 变量引用。
 */
function reference(name: string): string {
  return `var(${name})`;
}

/**
 * 将一个显式变量名分组投影为同形状的 CSS 引用。
 *
 * @param names - 已批准的 CSS 变量名分组。
 * @returns 同形状的 CSS 引用分组。
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
