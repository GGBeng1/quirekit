import type { QuireKitThemeVariableReferences } from "@quirekit/ui";

/**
 * Projects one typography role without assigning a foreground or HTML element.
 *
 * @param role - Theme-aware references for one complete typography role.
 * @param code - Whether individual code operators must remain visually separate.
 * @returns CSS declarations shared by role utilities and semantic elements.
 */
export function typographyDeclarations(
  role: QuireKitThemeVariableReferences["typography"]["body"],
  code: boolean
): Record<string, string> {
  return {
    "font-family": role.fontFamily,
    "font-size": role.fontSize,
    "line-height": role.lineHeight,
    "font-weight": role.fontWeight,
    "letter-spacing": role.letterSpacing,
    ...(code ? { "font-variant-ligatures": "none" } : {})
  };
}

/** Shared inline code surface, independent of its font role and document spacing. */
export const inlineCodeDeclarations = Object.freeze({
  border: "var(--qk-border-width-default) solid var(--qk-color-border-subtle)",
  "border-radius": "var(--qk-radius-control)",
  "background-color": "var(--qk-color-surface-subtle)",
  padding: ".125em .35em",
  "white-space": "normal",
  "overflow-wrap": "anywhere",
  "box-decoration-break": "clone"
});
