import { toolbarCssVariableNames } from "./names";

/** CSS-reference projection of every Toolbar component token. */
export const toolbarVariableReferences = Object.freeze({
  typography: mapReferences(toolbarCssVariableNames.typography),
  geometry: mapReferences(toolbarCssVariableNames.geometry),
  color: mapReferences(toolbarCssVariableNames.color),
  feedbackDuration: reference(toolbarCssVariableNames.feedbackDuration),
  feedbackEasing: reference(toolbarCssVariableNames.feedbackEasing)
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
 * Projects a variable-name group to same-shaped CSS references.
 *
 * @param names - Approved Toolbar variable-name group.
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
