import { buttonCssVariableNames } from "./names";

/** CSS-reference projection of every Button component token. */
export const buttonVariableReferences = Object.freeze({
  typography: mapReferences(buttonCssVariableNames.typography),
  size: Object.freeze({
    xs: mapReferences(buttonCssVariableNames.size.xs),
    sm: mapReferences(buttonCssVariableNames.size.sm),
    md: mapReferences(buttonCssVariableNames.size.md),
    lg: mapReferences(buttonCssVariableNames.size.lg),
    xl: mapReferences(buttonCssVariableNames.size.xl)
  }),
  color: Object.freeze({
    neutral: mapReferences(buttonCssVariableNames.color.neutral),
    primary: mapReferences(buttonCssVariableNames.color.primary),
    info: mapReferences(buttonCssVariableNames.color.info),
    success: mapReferences(buttonCssVariableNames.color.success),
    warning: mapReferences(buttonCssVariableNames.color.warning),
    danger: mapReferences(buttonCssVariableNames.color.danger)
  }),
  disabled: mapReferences(buttonCssVariableNames.disabled),
  borderWidth: reference(buttonCssVariableNames.borderWidth),
  focusColor: reference(buttonCssVariableNames.focusColor),
  hoverOpacity: reference(buttonCssVariableNames.hoverOpacity),
  pressedOpacity: reference(buttonCssVariableNames.pressedOpacity),
  feedbackDuration: reference(buttonCssVariableNames.feedbackDuration),
  feedbackEasing: reference(buttonCssVariableNames.feedbackEasing)
});

/**
 * Creates a CSS reference to an explicitly declared component variable.
 *
 * @param name - Declared CSS custom-property name.
 * @returns CSS variable reference.
 */
function reference(name: string): string {
  return `var(${name})`;
}

/**
 * Projects one explicit component-variable group to CSS references.
 *
 * @param names - Approved variable names.
 * @returns Same-shaped CSS references.
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
