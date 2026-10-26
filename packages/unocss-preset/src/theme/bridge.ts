import { themeVariableReferences } from "@quirekit/ui";
import { createUnoTheme } from "./create";

/**
 * UnoCSS color tokens projected from the explicit QuireKit semantic-variable
 * contract. Keys are intentionally flat so editor integrations can enumerate
 * the complete `qk-*` namespace without interpreting nested objects.
 */
export const quireKitUnoColorTokens = createUnoTheme(
  themeVariableReferences
).colors;

/** UnoCSS theme bridge backed only by declared QuireKit semantic variables. */
export const quireKitUnoTheme = createUnoTheme(themeVariableReferences);
