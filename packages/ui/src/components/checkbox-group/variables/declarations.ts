import type { QuireKitCheckboxGroupTokens } from "../types";
/**
 * Publishes direct component-to-CSS mappings for theme consumers and the atlas.
 * @param tokens - Group configuration.
 * @returns Group CSS declarations.
 */
export function createCheckboxGroupCssVariables(tokens: QuireKitCheckboxGroupTokens): Readonly<Record<string, string>> {
  return { "--qk-checkbox-group-gap": tokens.gap, "--qk-checkbox-group-inline-gap": tokens.inlineGap, "--qk-checkbox-group-label-color": tokens.labelColor };
}
