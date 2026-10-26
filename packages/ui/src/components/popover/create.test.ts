import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createPopoverTokens } from "./create";
import { createTooltipTokens } from "../tooltip/create";
import {
  createPopoverCssVariables,
  popoverCssVariableNames
} from "./variables";

describe("createPopoverTokens", () => {
  it("uses the same compact pointer scale as Tooltip across themes", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      expect(createPopoverTokens(theme).arrowSize).toBe(createTooltipTokens(theme).arrowSize);
    }
  });
  it("derives every visible value from semantic theme roles", () => {
    const theme = createTheme({ profile: "precision", scheme: "light" });
    const tokens = createPopoverTokens(theme);

    expect(tokens.background).toBe(theme.color.surface.overlay);
    expect(tokens.borderColor).toBe(theme.color.border.default);
    expect(tokens.radius).toBe(theme.radius.overlay);
    expect(tokens.shadow).toBe(theme.elevation.overlay);
    expect(tokens.padding).toBe(theme.spacing.surface);
    expect(tokens.layer).toBe(theme.layer.overlay);
  });

  it("changes surface and elevation with the selected color scheme", () => {
    const light = createPopoverTokens(
      createTheme({ profile: "ink", scheme: "light" })
    );
    const dark = createPopoverTokens(
      createTheme({ profile: "ink", scheme: "dark" })
    );

    expect(dark.background).not.toBe(light.background);
    expect(dark.shadow).not.toBe(light.shadow);
    expect(dark.foreground).not.toBe(light.foreground);
  });

  it("projects the complete contract to explicit component variables", () => {
    const tokens = createPopoverTokens(
      createTheme({ profile: "precision", scheme: "light" })
    );
    const variables = createPopoverCssVariables(tokens);

    expect(variables[popoverCssVariableNames.background]).toBe(
      tokens.background
    );
    expect(variables[popoverCssVariableNames.title.fontWeight]).toBe(
      String(tokens.title.fontWeight)
    );
    expect(variables[popoverCssVariableNames.layer]).toBe(
      String(tokens.layer)
    );
    expect(JSON.stringify(variables)).not.toContain("focus-width");
    expect(Object.keys(variables)).toHaveLength(26);
  });
});
