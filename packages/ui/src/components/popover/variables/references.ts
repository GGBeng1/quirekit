import { popoverCssVariableNames } from "./names";

/** Popover 组件 token 的 CSS 引用投影。 */
export const popoverVariableReferences = Object.freeze({
  background: reference(popoverCssVariableNames.background),
  foreground: reference(popoverCssVariableNames.foreground),
  mutedForeground: reference(popoverCssVariableNames.mutedForeground),
  borderColor: reference(popoverCssVariableNames.borderColor),
  borderWidth: reference(popoverCssVariableNames.borderWidth),
  radius: reference(popoverCssVariableNames.radius),
  shadow: reference(popoverCssVariableNames.shadow),
  padding: reference(popoverCssVariableNames.padding),
  gap: reference(popoverCssVariableNames.gap),
  arrowSize: reference(popoverCssVariableNames.arrowSize),
  closeSize: reference(popoverCssVariableNames.closeSize),
  closeRadius: reference(popoverCssVariableNames.closeRadius),
  closeHoverBackground: reference(
    popoverCssVariableNames.closeHoverBackground
  ),
  closeForeground: reference(popoverCssVariableNames.closeForeground),
  focusColor: reference(popoverCssVariableNames.focusColor),
  fontFamily: reference(popoverCssVariableNames.fontFamily),
  title: mapReferences(popoverCssVariableNames.title),
  body: mapReferences(popoverCssVariableNames.body),
  motionDuration: reference(popoverCssVariableNames.motionDuration),
  enterEasing: reference(popoverCssVariableNames.enterEasing),
  exitEasing: reference(popoverCssVariableNames.exitEasing),
  layer: reference(popoverCssVariableNames.layer)
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
