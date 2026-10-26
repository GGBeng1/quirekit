import type { QuireKitTagTokens } from "../types";

/**
 * Emits direct tag-to-CSS projections for the theme and Token atlas.
 * @param tokens - Tag configuration.
 * @returns Component variable declarations.
 */
export function createTagCssVariables(tokens: QuireKitTagTokens): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {
    "--qk-tag-padding-inline": tokens.paddingInline, "--qk-tag-padding-block": tokens.paddingBlock,
    "--qk-tag-gap": tokens.gap, "--qk-tag-radius": tokens.radius, "--qk-tag-border-width": tokens.borderWidth
  };
  for (const [family, roles] of Object.entries(tokens.color)) {
    for (const role of ["text", "surface", "border", "solid", "onSolid"] as const) {
      variables[`--qk-tag-${family}-${role === "onSolid" ? "on-solid" : role}`] = roles[role];
    }
  }
  return Object.freeze(variables);
}
