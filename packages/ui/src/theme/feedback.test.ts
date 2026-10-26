import { describe, expect, it } from "vitest";
import { createTheme } from "./create";
import { parseQuireHexColor, quireContrastRatio } from "../tokens";
import { createFeedback, resolveFeedbackForeground } from "./feedback";

describe("readable feedback text selection", () => {
  it("retains readable source-near text and strengthens amber without changing its palette", () => {
    const theme = createTheme();
    expect(theme.color.action.text).toBe(theme.scales.primary[8]);
    for (const family of ["info", "success", "danger"] as const) {
      expect(theme.color[family].text).toBe(theme.scales[family][8]);
    }
    expect(quireContrastRatio(
      parseQuireHexColor(theme.color.warning.text),
      parseQuireHexColor(theme.color.warning.pressedSurface)
    )).toBeGreaterThanOrEqual(4.5);
    expect(theme.scales.warning[9]).toBe("#ba4e00");
    expect(theme.scales.warning[6]).toBe("#f3a21a");
  });

  it("preserves neutral text when chromatic sources change in every profile and scheme", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const recolored = createTheme({ profile, scheme, sources: { primary: "#13c2c2", warning: "#d99200" } });
        for (const role of ["primary", "secondary", "tertiary", "muted"] as const) {
          expect(recolored.color.text[role]).toBe(theme.color.text[role]);
        }
        expect(theme.color.text.tertiary).not.toBe(theme.color.text.secondary);
      }
    }
  });

  it("prefers the first passing candidate instead of the darkest possible one", () => {
    const scale = { ...createTheme().scales.info, 6: "#666666", 7: "#444444", 8: "#222222" };
    expect(resolveFeedbackForeground(scale, "#ffffff")).toBe(scale[6]);
  });

  it("extends a non-monotonic palette to the first readable same-family candidate", () => {
    const scale = { ...createTheme().scales.info, 6: "#dddddd", 7: "#aaaaaa", 8: "#cccccc", 9: "#000000" };
    expect(resolveFeedbackForeground(scale, "#ffffff")).toBe(scale[9]);
  });

  it("checks every Soft state instead of assuming the pressed surface has lowest contrast", () => {
    const scale = {
      ...createTheme().scales.info,
      1: "#aaaaaa", 2: "#eeeeee", 3: "#ffffff",
      6: "#666666", 7: "#555555", 8: "#444444", 9: "#333333"
    };
    for (const scheme of ["light", "dark"] as const) {
      const feedback = createFeedback(scale, scheme);
      expect(feedback.text).toBe(scale[9]);
      for (const background of [feedback.surface, feedback.hoverSurface, feedback.pressedSurface]) {
        expect(quireContrastRatio(parseQuireHexColor(feedback.text), parseQuireHexColor(background))).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("falls back to a readable neutral when a custom family has no passing text", () => {
    const scale = {
      ...createTheme().scales.info,
      1: "#ffffff", 2: "#f0f0f0", 3: "#e0e0e0",
      6: "#cccccc", 7: "#cccccc", 8: "#cccccc", 9: "#cccccc", 10: "#cccccc", 11: "#cccccc"
    };
    expect(createFeedback(scale, "light").text).toBe("#000000");
    expect(createFeedback(scale, "dark").text).toBe("#000000");
  });

  it("maximizes the weakest state when no candidate can pass incompatible surfaces", () => {
    const scale = {
      ...createTheme().scales.info,
      1: "#000000", 2: "#ffffff", 3: "#777777",
      6: "#777777", 7: "#aaaaaa", 8: "#cccccc", 9: "#000000", 10: "#eeeeee", 11: "#ffffff"
    };
    const feedback = createFeedback(scale, "light");
    expect(feedback.text).toBe(scale[7]);
    expect(quireContrastRatio(parseQuireHexColor(feedback.text), parseQuireHexColor(scale[3]))).toBeLessThan(4.5);
  });
});
