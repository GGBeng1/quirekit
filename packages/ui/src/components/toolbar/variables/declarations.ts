import type { QuireKitToolbarTokens } from "../types";
import {
  toolbarCssVariableNames,
  type QuireKitToolbarCssVariableName
} from "./names";

/**
 * Projects one Toolbar token contract to explicit CSS variables.
 *
 * @param tokens - Approved Toolbar component tokens.
 * @returns Immutable flat declaration map.
 */
export function createToolbarCssVariables(
  tokens: QuireKitToolbarTokens
): Readonly<Record<QuireKitToolbarCssVariableName, string>> {
  const names = toolbarCssVariableNames;
  return Object.freeze({
    ...flatDeclarations(names.typography, tokens.typography),
    ...flatDeclarations(names.geometry, tokens.geometry),
    ...flatDeclarations(names.color, tokens.color),
    [names.feedbackDuration]: tokens.feedbackDuration,
    [names.feedbackEasing]: tokens.feedbackEasing
  }) as Readonly<Record<QuireKitToolbarCssVariableName, string>>;
}

/**
 * Pairs one variable-name group with matching Toolbar values.
 *
 * @param names - Explicit Toolbar variable names.
 * @param values - Matching Toolbar token values.
 * @returns Flat CSS declaration entries.
 */
function flatDeclarations(
  names: Readonly<Record<string, string>>,
  values: object
): Record<string, string> {
  const entries = Object.entries(values) as Array<[string, string | number]>;
  return Object.fromEntries(
    entries.map(([key, value]) => [names[key], String(value)])
  ) as Record<string, string>;
}
