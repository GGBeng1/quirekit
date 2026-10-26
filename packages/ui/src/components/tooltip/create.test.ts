import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import {
  createTooltipTokens,
  defaultTooltipCloseDelay,
  defaultTooltipOpenDelay,
  resolveTooltipContent
} from "./create";
import {
  createTooltipCssVariables,
  tooltipCssVariableNames
} from "./variables";

describe("createTooltipTokens", () => {
  it.each(["light", "dark"] as const)("keeps inverted tooltip surfaces independent of primary text in %s", scheme => {
    const theme = createTheme({ scheme });
    const recolored = {
      ...theme,
      color: { ...theme.color, text: { ...theme.color.text, primary: scheme === "light" ? "#000000" : "#ffffff" } }
    };
    expect(createTooltipTokens(recolored)).toEqual(createTooltipTokens(theme));
  });

  it("derives a compact inverse surface from semantic theme roles", () => {
    const theme = createTheme({ profile: "precision", scheme: "light" });
    const tokens = createTooltipTokens(theme);

    expect(tokens.background).toBe(theme.color.surface.inverse);
    expect(tokens.foreground).toBe(theme.color.text.inverse);
    expect(tokens.radius).toBe(theme.radius.control);
    expect(tokens.shadow).toBe(theme.elevation.overlay);
    expect(tokens.borderWidth).toBe(theme.borderWidth.none);
    expect(tokens.typography.fontSize).toBe(
      theme.typography.compact.fontSize
    );
    expect(tokens.layer).toBe(theme.layer.tooltip);
  });

  it("keeps inverse contrast and overlay elevation scheme-aware", () => {
    const light = createTooltipTokens(
      createTheme({ profile: "ink", scheme: "light" })
    );
    const dark = createTooltipTokens(
      createTheme({ profile: "ink", scheme: "dark" })
    );

    expect(dark.background).not.toBe(light.background);
    expect(dark.foreground).not.toBe(light.foreground);
    expect(dark.shadow).not.toBe(light.shadow);
  });

  it("projects every visible contract value to explicit CSS variables", () => {
    const tokens = createTooltipTokens(
      createTheme({ profile: "precision", scheme: "light" })
    );
    const variables = createTooltipCssVariables(tokens);

    expect(variables[tooltipCssVariableNames.background]).toBe(
      tokens.background
    );
    expect(variables[tooltipCssVariableNames.typography.fontWeight]).toBe(
      String(tokens.typography.fontWeight)
    );
    expect(variables[tooltipCssVariableNames.layer]).toBe(
      String(tokens.layer)
    );
    expect(Object.keys(variables)).toHaveLength(19);
    expect(JSON.stringify(variables)).not.toMatch(/outline|ring/u);
  });

  it("uses a short delayed open and a smaller close buffer", () => {
    expect(defaultTooltipOpenDelay).toBe(400);
    expect(defaultTooltipCloseDelay).toBe(100);
    expect(defaultTooltipOpenDelay).toBeGreaterThan(
      defaultTooltipCloseDelay
    );
  });
});

describe("resolveTooltipContent", () => {
  it("uses the regular label for an available subject", () => {
    expect(
      resolveTooltipContent({
        content: "插入链接",
        disabledReason: "请先选择文本",
        subjectDisabled: false
      })
    ).toBe("插入链接");
  });

  it("uses the disabled reason for an unavailable subject", () => {
    expect(
      resolveTooltipContent({
        content: "插入链接",
        disabledReason: "请先选择文本",
        subjectDisabled: true
      })
    ).toBe("请先选择文本");
  });

  it("does not replace a useful label with an empty disabled reason", () => {
    expect(
      resolveTooltipContent({
        content: "插入链接",
        disabledReason: "  ",
        subjectDisabled: true
      })
    ).toBe("插入链接");
    expect(resolveTooltipContent({ content: "  " })).toBeUndefined();
  });
});
