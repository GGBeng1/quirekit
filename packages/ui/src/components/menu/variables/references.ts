import { menuCssVariableNames } from "./names";

/** CSS-reference projection of every Menu component token. */
export const menuVariableReferences = Object.freeze({
  typography: mapReferences(menuCssVariableNames.typography),
  metadataTypography: mapReferences(menuCssVariableNames.metadataTypography),
  color: mapReferences(menuCssVariableNames.color),
  geometry: mapReferences(menuCssVariableNames.geometry),
  shadow: reference(menuCssVariableNames.shadow),
  layer: reference(menuCssVariableNames.layer),
  feedbackDuration: reference(menuCssVariableNames.feedbackDuration),
  overlayDuration: reference(menuCssVariableNames.overlayDuration),
  feedbackEasing: reference(menuCssVariableNames.feedbackEasing),
  enterEasing: reference(menuCssVariableNames.enterEasing),
  exitEasing: reference(menuCssVariableNames.exitEasing)
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
