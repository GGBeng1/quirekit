import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createMenuTokens } from "./create";
import {
  createMenuCssVariables,
  menuCssVariableNames,
  menuVariableReferences
} from "./variables";

describe("Menu component tokens", () => {
  it("derives overlay, row, and typography roles from semantic tokens", () => {
    const theme = createTheme();
    const tokens = createMenuTokens(theme);

    expect(tokens.color.surface).toBe(theme.color.surface.overlay);
    expect(tokens.color.highlightedBackground).toBe(theme.color.surface.hover);
    expect(tokens.color.dangerForeground).toBe(theme.color.danger.text);
    expect(tokens.geometry.contentWidth).toBe("200px");
    expect(tokens.geometry.itemHeight).toBe(theme.control.regular);
    expect(tokens.geometry.contentPadding).toBe(theme.spacing.inlineTight);
    expect(tokens.typography.fontWeight).toBe(theme.typography.control.fontWeight);
    expect(tokens.typography.fontSize).toBe(theme.typography.compact.fontSize);
    expect(tokens.metadataTypography.fontFamily).toBe(theme.typography.code.fontFamily);
    expect(tokens.shadow).toBe(theme.elevation.overlay);
    expect(tokens.layer).toBe(theme.layer.overlay);
  });

  it("keeps dark theme values behind the same component-token contract", () => {
    const theme = createTheme({ scheme: "dark", profile: "ink" });
    const tokens = createMenuTokens(theme);

    expect(tokens.color.surface).toBe(theme.color.surface.overlay);
    expect(tokens.color.foreground).toBe(theme.color.text.secondary);
    expect(tokens.color.checkedBackground).toBe(theme.color.surface.selected);
    expect(tokens.color.highlightedBackground).not.toBe(tokens.color.surface);
    expect(tokens.color.dangerForeground).toBe(theme.color.danger.text);
  });

  it("projects every component field to an explicit CSS variable", () => {
    const variables = createMenuCssVariables(createMenuTokens(createTheme()));

    expect(variables[menuCssVariableNames.color.surface]).toBeDefined();
    expect(variables[menuCssVariableNames.geometry.contentWidth]).toBe("200px");
    expect(variables[menuCssVariableNames.geometry.itemHeight]).toBe("32px");
    expect(variables[menuCssVariableNames.feedbackDuration]).toBe("120ms");
    expect(menuVariableReferences.color.surface).toBe(
      "var(--qk-menu-surface)"
    );
    expect(JSON.stringify(variables)).not.toContain("focus-width");
    expect(Object.keys(variables)).toHaveLength(39);
  });
});
