import type { QuireKitKbdTokens } from "../types";
/**
 * Projects key-hint roles and density mappings to CSS.
 * @param tokens - Key-hint configuration.
 * @returns Explicit CSS declarations.
 */
export function createKbdCssVariables(tokens: QuireKitKbdTokens): Readonly<Record<string, string>> {
  const variables: Record<string, string> = {
    "--qk-kbd-foreground": tokens.foreground, "--qk-kbd-background": tokens.background,
    "--qk-kbd-border-color": tokens.borderColor, "--qk-kbd-border-width": tokens.borderWidth,
    "--qk-kbd-radius": tokens.radius, "--qk-kbd-font-family": tokens.fontFamily,
    "--qk-kbd-font-weight": String(tokens.fontWeight), "--qk-kbd-letter-spacing": tokens.letterSpacing
  };
  for (const [size, roles] of Object.entries(tokens.size)) {
    variables[`--qk-kbd-${size}-min-height`] = roles.minHeight;
    variables[`--qk-kbd-${size}-font-size`] = roles.fontSize;
    variables[`--qk-kbd-${size}-padding-inline`] = roles.paddingInline;
  }
  return Object.freeze(variables);
}
