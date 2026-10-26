import type { QuireKitPopoverTokens } from "../types";
import {
  popoverCssVariableNames,
  type QuireKitPopoverCssVariableName
} from "./names";

/**
 * 将 Popover 组件 token 投影为显式 CSS 变量声明。
 *
 * @param tokens - 已批准的 Popover 组件 token。
 * @returns 不可变的扁平 CSS 变量声明。
 */
export function createPopoverCssVariables(
  tokens: QuireKitPopoverTokens
): Readonly<Record<QuireKitPopoverCssVariableName, string>> {
  const name = popoverCssVariableNames;
  return Object.freeze({
    [name.background]: tokens.background,
    [name.foreground]: tokens.foreground,
    [name.mutedForeground]: tokens.mutedForeground,
    [name.borderColor]: tokens.borderColor,
    [name.borderWidth]: tokens.borderWidth,
    [name.radius]: tokens.radius,
    [name.shadow]: tokens.shadow,
    [name.padding]: tokens.padding,
    [name.gap]: tokens.gap,
    [name.arrowSize]: tokens.arrowSize,
    [name.closeSize]: tokens.closeSize,
    [name.closeRadius]: tokens.closeRadius,
    [name.closeHoverBackground]: tokens.closeHoverBackground,
    [name.closeForeground]: tokens.closeForeground,
    [name.focusColor]: tokens.focusColor,
    [name.fontFamily]: tokens.fontFamily,
    [name.title.fontSize]: tokens.title.fontSize,
    [name.title.lineHeight]: tokens.title.lineHeight,
    [name.title.fontWeight]: String(tokens.title.fontWeight),
    [name.title.letterSpacing]: tokens.title.letterSpacing,
    [name.body.fontSize]: tokens.body.fontSize,
    [name.body.lineHeight]: tokens.body.lineHeight,
    [name.motionDuration]: tokens.motionDuration,
    [name.enterEasing]: tokens.enterEasing,
    [name.exitEasing]: tokens.exitEasing,
    [name.layer]: String(tokens.layer)
  }) as Readonly<Record<QuireKitPopoverCssVariableName, string>>;
}
