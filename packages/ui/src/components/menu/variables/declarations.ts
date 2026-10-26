import type { QuireKitMenuTokens } from "../types";
import {
  menuCssVariableNames,
  type QuireKitMenuCssVariableName
} from "./names";

/**
 * Projects one Menu token contract to its explicit CSS variables.
 *
 * @param tokens - Approved Menu component tokens.
 * @returns Immutable flat declaration map.
 */
export function createMenuCssVariables(
  tokens: QuireKitMenuTokens
): Readonly<Record<QuireKitMenuCssVariableName, string>> {
  const name = menuCssVariableNames;
  return Object.freeze({
    ...flatDeclarations(name.typography, tokens.typography),
    ...flatDeclarations(name.metadataTypography, tokens.metadataTypography),
    ...flatDeclarations(name.color, tokens.color),
    ...flatDeclarations(name.geometry, tokens.geometry),
    [name.shadow]: tokens.shadow,
    [name.layer]: String(tokens.layer),
    [name.feedbackDuration]: tokens.feedbackDuration,
    [name.overlayDuration]: tokens.overlayDuration,
    [name.feedbackEasing]: tokens.feedbackEasing,
    [name.enterEasing]: tokens.enterEasing,
    [name.exitEasing]: tokens.exitEasing
  }) as Readonly<Record<QuireKitMenuCssVariableName, string>>;
}

/**
 * Pairs one explicit variable-name group with matching component values.
 *
 * @param names - Explicit variable names.
 * @param values - Matching component-token values.
 * @returns Flat CSS declaration entries.
 */
function flatDeclarations<T extends object>(
  names: Readonly<Record<string, string>>,
  values: T
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(values as Readonly<Record<string, string | number>>).map(
      ([key, value]) => [names[key], String(value)]
    )
  ) as Record<string, string>;
}
