import type {
  QuireKitButtonSizeTokens,
  QuireKitButtonColorTokens,
  QuireKitButtonTokens
} from "../types";
import {
  buttonCssVariableNames,
  type QuireKitButtonCssVariableName
} from "./names";

/**
 * Projects one Button token contract to its explicit CSS variables.
 *
 * @param tokens - Approved Button component tokens.
 * @returns Immutable flat declaration map.
 */
export function createButtonCssVariables(
  tokens: QuireKitButtonTokens
): Readonly<Record<QuireKitButtonCssVariableName, string>> {
  const name = buttonCssVariableNames;
  return Object.freeze({
    [name.typography.fontFamily]: tokens.fontFamily,
    [name.typography.fontWeight]: String(tokens.fontWeight),
    [name.typography.letterSpacing]: tokens.letterSpacing,
    ...sizeDeclarations(name.size.xs, tokens.size.xs),
    ...sizeDeclarations(name.size.sm, tokens.size.sm),
    ...sizeDeclarations(name.size.md, tokens.size.md),
    ...sizeDeclarations(name.size.lg, tokens.size.lg),
    ...sizeDeclarations(name.size.xl, tokens.size.xl),
    ...colorDeclarations(name.color.neutral, tokens.color.neutral),
    ...colorDeclarations(name.color.primary, tokens.color.primary),
    ...colorDeclarations(name.color.info, tokens.color.info),
    ...colorDeclarations(name.color.success, tokens.color.success),
    ...colorDeclarations(name.color.warning, tokens.color.warning),
    ...colorDeclarations(name.color.danger, tokens.color.danger),
    [name.disabled.foreground]: tokens.disabled.foreground,
    [name.disabled.background]: tokens.disabled.background,
    [name.disabled.borderColor]: tokens.disabled.borderColor,
    [name.borderWidth]: tokens.borderWidth,
    [name.focusColor]: tokens.focusColor,
    [name.hoverOpacity]: String(tokens.hoverOpacity),
    [name.pressedOpacity]: String(tokens.pressedOpacity),
    [name.feedbackDuration]: tokens.feedbackDuration,
    [name.feedbackEasing]: tokens.feedbackEasing
  }) as Readonly<Record<QuireKitButtonCssVariableName, string>>;
}

/**
 * Pairs one explicit size-variable group with matching component values.
 *
 * @param names - Explicit variable names for one public size.
 * @param value - Matching component-size values.
 * @returns Flat CSS declaration entries.
 */
function sizeDeclarations(
  names: Readonly<Record<keyof QuireKitButtonSizeTokens, string>>,
  value: QuireKitButtonSizeTokens
): Record<string, string> {
  return {
    [names.height]: value.height,
    [names.paddingInline]: value.paddingInline,
    [names.gap]: value.gap,
    [names.iconSize]: value.iconSize,
    [names.radius]: value.radius,
    [names.fontSize]: value.fontSize,
    [names.lineHeight]: value.lineHeight
  };
}

/**
 * Pairs one explicit color-variable group with matching component values.
 *
 * @param names - Explicit variable names for one semantic color.
 * @param value - Matching component-color values.
 * @returns Flat CSS declaration entries.
 */
function colorDeclarations(
  names: Readonly<Record<keyof QuireKitButtonColorTokens, string>>,
  value: QuireKitButtonColorTokens
): Record<string, string> {
  return {
    [names.foreground]: value.foreground,
    [names.solidForeground]: value.solidForeground,
    [names.solidBackground]: value.solidBackground,
    [names.solidHoverBackground]: value.solidHoverBackground,
    [names.solidPressedBackground]: value.solidPressedBackground,
    [names.softBackground]: value.softBackground,
    [names.softHoverBackground]: value.softHoverBackground,
    [names.softPressedBackground]: value.softPressedBackground,
    [names.borderColor]: value.borderColor
  };
}
