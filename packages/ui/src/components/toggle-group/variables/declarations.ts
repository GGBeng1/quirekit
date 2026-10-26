import type { QuireKitToggleGroupTokens } from "../types";
/**
 * Publishes direct component-to-CSS mappings for theme consumers and the atlas.
 * @param tokens - Group configuration.
 * @returns Group CSS declarations.
 */
export function createToggleGroupCssVariables(tokens: QuireKitToggleGroupTokens): Readonly<Record<string, string>> {
  return { "--qk-toggle-group-gap": tokens.gap };
}
