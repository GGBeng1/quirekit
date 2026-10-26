import type { QuireKitTooltipTokens } from "../types";
import {
  tooltipCssVariableNames,
  type QuireKitTooltipCssVariableName
} from "./names";

/**
 * 将 Tooltip 组件 token 投影为显式 CSS 变量声明。
 *
 * @param tokens - 已批准的 Tooltip 组件 token。
 * @returns 不可变的扁平 CSS 变量声明。
 */
export function createTooltipCssVariables(
  tokens: QuireKitTooltipTokens
): Readonly<Record<QuireKitTooltipCssVariableName, string>> {
  const name = tooltipCssVariableNames;
  return Object.freeze({
    [name.background]: tokens.background,
    [name.foreground]: tokens.foreground,
    [name.borderColor]: tokens.borderColor,
    [name.borderWidth]: tokens.borderWidth,
    [name.radius]: tokens.radius,
    [name.shadow]: tokens.shadow,
    [name.paddingBlock]: tokens.paddingBlock,
    [name.paddingInline]: tokens.paddingInline,
    [name.gap]: tokens.gap,
    [name.arrowSize]: tokens.arrowSize,
    [name.typography.fontFamily]: tokens.typography.fontFamily,
    [name.typography.fontSize]: tokens.typography.fontSize,
    [name.typography.lineHeight]: tokens.typography.lineHeight,
    [name.typography.fontWeight]: String(tokens.typography.fontWeight),
    [name.typography.letterSpacing]: tokens.typography.letterSpacing,
    [name.motionDuration]: tokens.motionDuration,
    [name.enterEasing]: tokens.enterEasing,
    [name.exitEasing]: tokens.exitEasing,
    [name.layer]: String(tokens.layer)
  }) as Readonly<Record<QuireKitTooltipCssVariableName, string>>;
}
