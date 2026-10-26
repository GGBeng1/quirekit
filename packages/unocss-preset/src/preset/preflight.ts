import { createTheme, createUiThemeCssVariables } from "@quirekit/ui";

/** Controls which preset-owned CSS layers are emitted. */
export interface CreateQuireKitPreflightCssOptions {
  /** Whether semantic variables for built-in theme profiles are emitted. */
  readonly includeDefaultTokens: boolean;
}

/**
 * Creates semantic-theme variables owned by the preset.
 *
 * @param options - Semantic-theme emission controls.
 * @returns CSS preflight owned by the QuireKit preset.
 */
export function createQuireKitPreflightCss(
  options: CreateQuireKitPreflightCssOptions
): string {
  const baseCss = createBaseCss();
  return options.includeDefaultTokens
    ? `${baseCss}\n${createThemeProfileCss()}`
    : baseCss;
}

/**
 * Emits the minimal document reset shared by every QuireKit application.
 *
 * The reset deliberately owns only invariant browser normalization. Product
 * color, typography and geometry continue to come from semantic utilities.
 *
 * @returns Stable browser normalization CSS.
 */
function createBaseCss(): string {
  return [
    "html, body, #design { margin: 0; padding: 0; width: 100%; min-height: 100%; }",
    "html, body { overflow-x: clip; }",
    "*, *::before, *::after { box-sizing: border-box; }",
    "button, input, textarea, select { font: inherit; }",
    // Recipes set only border widths; components must not depend on the host app shipping a border reset.
    '[class*="qk-"], [class*="qk-"]::before, [class*="qk-"]::after { border-width: 0; border-style: solid; }',
    // Ark keeps some surfaces mounted after exit; recipe display must not override hidden.
    '[data-scope][hidden]:not([hidden="until-found"]) { display: none !important; }'
  ].join("\n");
}

/**
 * Emits semantic-token values for every built-in theme profile.
 *
 * @returns Every built-in neutral profile in light and dark schemes.
 */
function createThemeProfileCss(): string {
  return (["precision", "ink", "slate", "stone"] as const).flatMap(profile =>
    (["light", "dark"] as const).map(scheme => renderVariables(
      `${profile === 'precision' && scheme === 'light' ? ':root, ' : ''}[data-qk-theme="${profile}"][data-qk-scheme="${scheme}"]`,
      createUiThemeCssVariables(createTheme({ profile, scheme }))
    ))
  ).join("\n");
}

/**
 * Renders one deterministic CSS custom-property block.
 *
 * @param selector - CSS selector owning the variables.
 * @param variables - Stable CSS variable map.
 * @returns CSS declaration block.
 */
function renderVariables(
  selector: string,
  variables: Readonly<Record<string, string>>
): string {
  const entries = Object.entries(variables).sort(compareVariableEntries);
  const declarations: string[] = [];
  for (const [name, value] of entries) {
    declarations.push(`  ${name}: ${value};`);
  }
  return `${selector} {\n${declarations.join("\n")}\n}`;
}

/**
 * Orders CSS custom-property entries by their declared names.
 *
 * @param left - First CSS variable entry.
 * @param right - Second CSS variable entry.
 * @returns Negative, zero, or positive ordering result.
 */
function compareVariableEntries(
  left: readonly [string, string],
  right: readonly [string, string]
): number {
  return left[0].localeCompare(right[0]);
}
