import type {
  QuireKitSegmentedSizeTokens,
  QuireKitSegmentedTokens
} from "../types";
import {
  segmentedCssVariableNames,
  type QuireKitSegmentedCssVariableName
} from "./names";

/**
 * 把 Segmented Control 组件合同投影为显式 CSS 变量。
 *
 * @param tokens - 已批准的 Segmented Control 组件 token。
 * @returns 不可变的扁平声明表。
 */
export function createSegmentedCssVariables(
  tokens: QuireKitSegmentedTokens
): Readonly<Record<QuireKitSegmentedCssVariableName, string>> {
  const name = segmentedCssVariableNames;
  return Object.freeze({
    [name.typography.fontFamily]: tokens.fontFamily,
    [name.typography.fontWeight]: String(tokens.fontWeight),
    [name.typography.letterSpacing]: tokens.letterSpacing,
    ...sizeDeclarations(name.size.xs, tokens.size.xs),
    ...sizeDeclarations(name.size.sm, tokens.size.sm),
    ...sizeDeclarations(name.size.md, tokens.size.md),
    ...sizeDeclarations(name.size.lg, tokens.size.lg),
    ...sizeDeclarations(name.size.xl, tokens.size.xl),
    [name.trackInset]: tokens.trackInset,
    [name.trackRadius]: tokens.trackRadius,
    [name.indicatorRadius]: tokens.indicatorRadius,
    [name.trackBackground]: tokens.trackBackground,
    [name.foreground]: tokens.foreground,
    [name.hoverForeground]: tokens.hoverForeground,
    [name.hoverBackground]: tokens.hoverBackground,
    [name.selectedForeground]: tokens.selectedForeground,
    [name.selectedBackground]: tokens.selectedBackground,
    [name.disabledForeground]: tokens.disabledForeground,
    [name.focusColor]: tokens.focusColor,
    [name.transitionDuration]: tokens.transitionDuration,
    [name.transitionEasing]: tokens.transitionEasing
  }) as Readonly<Record<QuireKitSegmentedCssVariableName, string>>;
}

/**
 * 把一个尺寸变量组与对应组件值配对。
 *
 * @param names - 一个公开尺寸的显式变量名。
 * @param value - 同一尺寸的组件 token。
 * @returns 扁平 CSS 声明条目。
 */
function sizeDeclarations(
  names: Readonly<Record<keyof QuireKitSegmentedSizeTokens, string>>,
  value: QuireKitSegmentedSizeTokens
): Record<string, string> {
  return {
    [names.height]: value.height,
    [names.paddingInline]: value.paddingInline,
    [names.gap]: value.gap,
    [names.iconSize]: value.iconSize,
    [names.fontSize]: value.fontSize,
    [names.lineHeight]: value.lineHeight
  };
}
