import type { QuireKitSemanticFeedbackTokens, QuireKitSemanticTypographyRole, QuireKitTheme } from "../types";
import { themeCssVariableNames, type QuireKitThemeCssVariableName } from "./names";

/**
 * Projects one semantic theme to the complete explicit CSS-variable contract.
 *
 * @param theme - Compiled semantic theme projection.
 * @returns Immutable flat declaration map backed only by approved theme tokens.
 */
export function createThemeCssVariables(theme: QuireKitTheme): Readonly<Record<QuireKitThemeCssVariableName, string>> {
  const name = themeCssVariableNames;
  const color = theme.color;
  return Object.freeze({
    [name.color.surface.transparent]: color.surface.transparent,
    [name.color.surface.workspace]: color.surface.workspace, [name.color.surface.page]: color.surface.page,
    [name.color.surface.chrome]: color.surface.chrome, [name.color.surface.subtle]: color.surface.subtle,
    [name.color.surface.raised]: color.surface.raised, [name.color.surface.overlay]: color.surface.overlay,
    [name.color.surface.inverse]: color.surface.inverse,
    [name.color.surface.hover]: color.surface.hover, [name.color.surface.pressed]: color.surface.pressed,
    [name.color.surface.selected]: color.surface.selected, [name.color.surface.disabled]: color.surface.disabled,
    [name.color.surface.scrim]: color.surface.scrim,
    [name.color.text.muted]: color.text.muted, [name.color.text.placeholder]: color.text.placeholder,
    [name.color.text.primary]: color.text.primary, [name.color.text.secondary]: color.text.secondary,
    [name.color.text.accent]: color.text.accent,
    [name.color.text.tertiary]: color.text.tertiary, [name.color.text.disabled]: color.text.disabled,
    [name.color.text.inverse]: color.text.inverse, [name.color.text.onAccent]: color.text.onAccent,
    [name.color.icon.primary]: color.icon.primary, [name.color.icon.secondary]: color.icon.secondary,
    [name.color.icon.disabled]: color.icon.disabled, [name.color.icon.onAccent]: color.icon.onAccent,
    [name.color.border.subtle]: color.border.subtle, [name.color.border.default]: color.border.default,
    [name.color.border.strong]: color.border.strong, [name.color.border.focus]: color.border.focus,
    [name.color.border.disabled]: color.border.disabled,
    [name.color.action.primary]: color.action.primary, [name.color.action.text]: color.action.text,
    [name.color.action.hover]: color.action.hover,
    [name.color.action.pressed]: color.action.pressed, [name.color.action.soft]: color.action.soft,
    [name.color.action.softHover]: color.action.softHover, [name.color.action.softPressed]: color.action.softPressed,
    [name.color.action.foreground]: color.action.foreground,
    ...feedbackDeclarations(name.color.info, color.info), ...feedbackDeclarations(name.color.success, color.success),
    ...feedbackDeclarations(name.color.warning, color.warning), ...feedbackDeclarations(name.color.danger, color.danger),
    [name.color.selection.document]: color.selection.document, [name.color.selection.remote]: color.selection.remote,
    [name.color.selection.dropTarget]: color.selection.dropTarget,
    ...typographyDeclarations(name.typography.display, theme.typography.display),
    ...typographyDeclarations(name.typography.pageTitle, theme.typography.pageTitle),
    ...typographyDeclarations(name.typography.sectionTitle, theme.typography.sectionTitle),
    ...typographyDeclarations(name.typography.heading, theme.typography.heading),
    ...typographyDeclarations(name.typography.body, theme.typography.body),
    ...typographyDeclarations(name.typography.control, theme.typography.control),
    ...typographyDeclarations(name.typography.compact, theme.typography.compact),
    ...typographyDeclarations(name.typography.helper, theme.typography.helper),
    ...typographyDeclarations(name.typography.code, theme.typography.code),
    ...flatDeclarations(name.spacing, theme.spacing), ...flatDeclarations(name.radius, theme.radius),
    ...flatDeclarations(name.borderWidth, theme.borderWidth), ...flatDeclarations(name.elevation, theme.elevation),
    ...flatDeclarations(name.motion, theme.motion), ...flatDeclarations(name.opacity, theme.opacity),
    ...flatDeclarations(name.layer, theme.layer), ...flatDeclarations(name.control, theme.control)
  }) as Readonly<Record<QuireKitThemeCssVariableName, string>>;
}

/** @param names - Feedback variable names. @param values - Feedback token values. @returns Flat declarations. */
function feedbackDeclarations(names: Readonly<Record<string, string>>, values: QuireKitSemanticFeedbackTokens): Record<string, string> {
  return { [names.surface!]: values.surface, [names.hoverSurface!]: values.hoverSurface, [names.pressedSurface!]: values.pressedSurface, [names.border!]: values.border, [names.text!]: values.text, [names.foreground!]: values.foreground, [names.solid!]: values.solid, [names.onSolid!]: values.onSolid };
}

/** @param names - Typography variable names. @param value - Semantic typography role. @returns Flat declarations. */
function typographyDeclarations(names: Record<string, string>, value: QuireKitSemanticTypographyRole): Record<string, string> {
  return { [names.fontFamily!]: value.fontFamily, [names.fontSize!]: value.fontSize, [names.lineHeight!]: value.lineHeight, [names.fontWeight!]: String(value.fontWeight), [names.letterSpacing!]: value.letterSpacing };
}

/** @param names - Explicit variable names. @param values - Matching semantic values. @returns Flat declarations. */
function flatDeclarations(names: Readonly<Record<string, string>>, values: object): Record<string, string> {
  const entries = Object.entries(values) as Array<[string, string | number]>;
  return Object.fromEntries(entries.map(([key, value]) => [names[key], String(value)])) as Record<string, string>;
}
