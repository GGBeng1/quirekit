import { createTheme, createThemeCssVariables } from "../../theme";

/**
 * Isolates code colors without resetting inherited typography or density tokens.
 * @param scheme - Explicit scheme for this source surface.
 * @returns Default-theme color variables for the requested scheme.
 */
function colors(scheme: "light" | "dark"): Readonly<Record<string, string>> {
  return Object.freeze(Object.fromEntries(
    Object.entries(createThemeCssVariables(createTheme({ scheme })))
      .filter(([name]) => name.startsWith("--qk-color-"))
  ));
}

/** Explicit schemes share immutable color maps; auto keeps the host's complete theme. */
export const codeBlockColors = { light: colors("light"), dark: colors("dark") };
