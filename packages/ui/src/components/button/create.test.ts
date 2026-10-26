import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { parseQuireHexColor, quireContrastRatio } from "../../tokens";
import { createButtonTokens } from "./create";
import {
  buttonCssVariableNames,
  buttonVariableReferences,
  createButtonCssVariables
} from "./variables";

describe("Button component tokens", () => {
  it("keeps neutral solids and Ink primary states independent of primary text overrides", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const recolored = {
          ...theme,
          color: { ...theme.color, text: { ...theme.color.text, primary: scheme === "light" ? "#000000" : "#ffffff" } }
        };
        const baseline = createButtonTokens(theme).color;
        const updated = createButtonTokens(recolored).color;
        expect(updated.neutral).toEqual(baseline.neutral);
        expect(updated.neutral.solidBackground).toBe(theme.color.surface.inverse);
        expect(updated.primary).toEqual(baseline.primary);
        if (profile === "ink") {
          expect(updated.primary.solidHoverBackground).toBe(theme.color.action.hover);
          expect(updated.primary.solidPressedBackground).toBe(theme.color.action.pressed);
        }
      }
    }
  });

  it("deepens every default light solid including black-label warning", () => {
    const theme = createTheme();
    const colors = createButtonTokens(theme).color;
    for (const family of ["primary", "info", "success", "warning", "danger"] as const) {
      expect(colors[family].solidHoverBackground).toBe(theme.scales[family][7]);
      expect(colors[family].solidPressedBackground).toBe(theme.scales[family][8]);
    }
    expect(colors.warning.solidForeground).toBe("#000000");
    expect(colors.warning.foreground).toBe(theme.color.warning.text);
    expect(quireContrastRatio(
      parseQuireHexColor(colors.warning.foreground),
      parseQuireHexColor(colors.warning.softPressedBackground)
    )).toBeGreaterThanOrEqual(4.5);
    expect(colors.warning.solidBackground).toBe("#f3a21a");
  });

  it("preserves solid text contrast through hover and press for default and custom colors", () => {
    for (const scheme of ["light", "dark"] as const) {
      for (const sources of [undefined, { primary: "#198754", success: "#bef264", warning: "#92400e" }]) {
        const tokens = createButtonTokens(createTheme({ scheme, sources }));
        for (const color of Object.values(tokens.color)) {
          const ratios = [color.solidBackground, color.solidHoverBackground, color.solidPressedBackground]
            .map(background => quireContrastRatio(parseQuireHexColor(color.solidForeground), parseQuireHexColor(background)));
          expect(ratios[0]).toBeGreaterThanOrEqual(4.5);
          expect(ratios[1]).toBeGreaterThanOrEqual(4.5);
          expect(ratios[2]).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("derives all five public sizes from semantic control and spacing roles", () => {
    const theme = createTheme();
    const tokens = createButtonTokens(theme);

    expect(tokens.size.xs).toEqual({
      height: theme.control.compact,
      paddingInline: theme.spacing.inline,
      gap: theme.spacing.inlineTight,
      iconSize: theme.control.icon,
      radius: theme.radius.control,
      fontSize: "13px",
      lineHeight: "1.6154"
    });
    expect(tokens.size.sm.height).toBe(theme.control.default);
    expect(tokens.size.md.height).toBe(theme.control.regular);
    expect(tokens.size.lg.radius).toBe(theme.radius.group);
    expect(tokens.size.xl.iconSize).toBe(theme.control.iconLarge);
    expect(tokens.fontFamily).toBe(theme.typography.control.fontFamily);
    expect(tokens.fontWeight).toBe(theme.typography.body.fontWeight);
  });

  it("keeps semantic color channels independent from finite paint variants", () => {
    const theme = createTheme({ scheme: "dark" });
    const tokens = createButtonTokens(theme);

    expect(tokens.color.neutral.foreground).toBe(theme.color.text.secondary);
    expect(tokens.color.neutral.softBackground).toBe(theme.scales.neutral[3]);
    expect(tokens.color.primary.solidBackground).toBe(theme.color.action.primary);
    expect(tokens.color.primary.foreground).toBe(theme.color.action.text);
    expect(tokens.color.primary.softBackground).toBe(theme.color.action.soft);
    expect(tokens.color.info.solidBackground).toBe(theme.color.info.solid);
    expect(tokens.color.success.solidBackground).toBe(theme.color.success.solid);
    expect(tokens.color.warning.solidBackground).toBe(theme.color.warning.solid);
    expect(tokens.color.danger.foreground).toBe(theme.color.danger.text);
    expect(tokens.color.danger.solidForeground).toBe(theme.color.danger.onSolid);
    expect(tokens.disabled.background).toBe(theme.color.surface.disabled);
    expect(tokens.disabled.borderColor).toBe(theme.color.border.disabled);
    expect(tokens.hoverOpacity).toBe(theme.opacity.hover);
    expect(tokens.pressedOpacity).toBe(theme.opacity.pressed);
  });

  it("derives configured semantic color sources instead of accepting call-site hex values", () => {
    const theme = createTheme({
      sources: {
        primary: "#0f766e",
        info: "#0369a1",
        success: "#15803d",
        warning: "#b45309",
        danger: "#be123c"
      }
    });
    const tokens = createButtonTokens(theme);

    expect(tokens.color.primary.solidBackground).toBe("#0f766e");
    expect(tokens.color.info.solidBackground).toBe("#0369a1");
    expect(tokens.color.success.solidBackground).toBe("#15803d");
    expect(tokens.color.warning.solidBackground).toBe("#b45309");
    expect(tokens.color.danger.solidBackground).toBe("#be123c");
  });

  it("projects only declared component CSS variables and references", () => {
    const declarations = createButtonCssVariables(
      createButtonTokens(createTheme())
    );

    expect(declarations).toHaveProperty(
      buttonCssVariableNames.size.sm.height,
      "28px"
    );
    expect(declarations).toHaveProperty(
      buttonCssVariableNames.color.primary.solidBackground
    );
    expect(buttonVariableReferences.size.sm.height).toBe(
      "var(--qk-button-sm-height)"
    );
    expect(declarations).toHaveProperty(buttonCssVariableNames.hoverOpacity, "0.94");
    expect(declarations).toHaveProperty(buttonCssVariableNames.pressedOpacity, "0.88");
    expect(JSON.stringify(declarations)).not.toContain("shadow");
    expect(JSON.stringify(declarations)).not.toContain("focus-width");
    expect(Object.keys(declarations)).toHaveLength(101);
  });
});
