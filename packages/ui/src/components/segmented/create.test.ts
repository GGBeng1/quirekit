import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createSegmentedTokens } from "./create";
import {
  createSegmentedCssVariables,
  segmentedCssVariableNames,
  segmentedVariableReferences
} from "./variables";

describe("Segmented Control component tokens", () => {
  it("derives five public sizes from semantic control roles", () => {
    const theme = createTheme();
    const tokens = createSegmentedTokens(theme);

    expect(tokens.size.xs.height).toBe("24px");
    expect(tokens.size.sm.height).toBe("28px");
    expect(tokens.size.md.height).toBe("32px");
    expect(tokens.size.lg.height).toBe("36px");
    expect(tokens.size.xl.height).toBe("40px");
    expect(tokens.size.sm.fontSize).toBe(theme.typography.compact.fontSize);
    expect(tokens.size.md.fontSize).toBe(theme.typography.control.fontSize);
    expect(tokens.fontWeight).toBe(theme.typography.body.fontWeight);
  });

  it("uses neutral semantic surfaces instead of the primary action color", () => {
    const theme = createTheme({
      sources: { primary: "#0f766e" }
    });
    const tokens = createSegmentedTokens(theme);

    expect(tokens.trackBackground).toBe(theme.color.surface.hover);
    expect(tokens.hoverBackground).toBe(theme.color.surface.pressed);
    expect(tokens.selectedBackground).toBe(theme.color.surface.raised);
    expect(tokens.selectedForeground).toBe(theme.color.text.primary);
    expect(tokens.selectedBackground).not.toBe(theme.color.action.primary);
    expect(tokens.focusColor).toBe(theme.color.border.focus);
  });

  it("keeps the track distinct from documentation surfaces in every built-in theme", () => {
    for (const profile of ["precision", "ink"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const tokens = createSegmentedTokens(theme);

        expect(tokens.trackBackground).not.toBe(theme.color.surface.subtle);
        expect(tokens.trackBackground).not.toBe(tokens.selectedBackground);
        expect(tokens.hoverBackground).not.toBe(tokens.trackBackground);
      }
    }
  });

  it("projects only explicit component variables and references", () => {
    const declarations = createSegmentedCssVariables(
      createSegmentedTokens(createTheme())
    );

    expect(declarations).toHaveProperty(
      segmentedCssVariableNames.size.sm.height,
      "28px"
    );
    expect(declarations).toHaveProperty(
      segmentedCssVariableNames.selectedBackground
    );
    expect(JSON.stringify(declarations)).not.toContain("segmented-selected-shadow");
    expect(JSON.stringify(declarations)).not.toContain("focus-width");
    expect(segmentedVariableReferences.size.sm.height).toBe(
      "var(--qk-segmented-sm-height)"
    );
    expect(Object.keys(declarations)).toHaveLength(46);
  });
});
