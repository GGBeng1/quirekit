import type { QuireKitBadgeTokens } from "../types";

/**
 * Emits direct badge-to-CSS projections for the theme and Token atlas.
 * @param tokens - Badge configuration.
 * @returns Component variable declarations.
 */
export function createBadgeCssVariables(tokens: QuireKitBadgeTokens): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {
    "--qk-badge-padding-inline": tokens.paddingInline, "--qk-badge-dot-size": tokens.dotSize,
    "--qk-badge-radius": tokens.radius, "--qk-badge-border-width": tokens.borderWidth
  };
  for (const [size, roles] of Object.entries(tokens.size)) {
    variables[`--qk-badge-${size}-height`] = roles.height;
    variables[`--qk-badge-${size}-font-size`] = roles.fontSize;
  }
  for (const [family, roles] of Object.entries(tokens.color)) {
    for (const role of ["text", "surface", "border", "solid", "onSolid"] as const) {
      variables[`--qk-badge-${family}-${role === "onSolid" ? "on-solid" : role}`] = roles[role];
    }
  }
  return Object.freeze(variables);
}
