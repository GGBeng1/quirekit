import { describe, expect, it } from "vitest";
import { defaultBaseTokens, parseQuireHexColor, quireContrastRatio, quireSrgbToOklch } from "../../tokens";
import { createTheme } from "../create";
import { createThemeCssVariables, themeCssVariableNames, themeVariableReferences } from "../variables";

/** @param foreground - Opaque text tone. @param background - Actual surface. @returns WCAG contrast ratio. */
function contrast(foreground: string, background: string): number {
  return quireContrastRatio(parseQuireHexColor(foreground), parseQuireHexColor(background));
}

describe("semantic text strengths", () => {
  it("uses the reviewed Precision hierarchy with clear perceptual separation", () => {
    const { text } = createTheme().color;
    const strengths = [text.primary, text.secondary, text.tertiary, text.muted];
    expect(strengths).toEqual(["#121c2c", "#2b3545", "#485161", "#656e7d"]);
    const lightness = strengths.map(tone => quireSrgbToOklch(parseQuireHexColor(tone)).l);
    for (let index = 1; index < lightness.length; index += 1) {
      expect(lightness[index]! - lightness[index - 1]!).toBeGreaterThanOrEqual(0.06);
    }
    expect(text.placeholder).toBe(text.disabled);
  });

  for (const profile of ["precision", "ink", "slate", "stone"] as const) {
    for (const scheme of ["light", "dark"] as const) {
      it(`retains four ordered opaque strengths in ${profile} ${scheme}`, () => {
        const { color, scales } = createTheme({ profile, scheme });
        const strengths = [color.text.primary, color.text.secondary, color.text.tertiary, color.text.muted];
        expect(new Set(strengths).size).toBe(4);
        expect(color.text).not.toHaveProperty("strong");
        expect(strengths).toEqual([scales.neutral[11], scales.neutral[10], scales.neutral[9], scales.neutral[8]]);
        expect(color.text.placeholder).toBe(scales.neutral[7]);
        expect(color.text.disabled).toBe(scales.neutral[7]);
        strengths.forEach(tone => expect(tone).toMatch(/^#[0-9a-f]{6}$/));
        for (let index = 1; index < strengths.length; index += 1) {
          const earlier = quireSrgbToOklch(parseQuireHexColor(strengths[index - 1]!)).l;
          const later = quireSrgbToOklch(parseQuireHexColor(strengths[index]!)).l;
          expect(scheme === "light" ? later - earlier : earlier - later).toBeGreaterThanOrEqual(0.06);
        }
      });

      it(`keeps each role readable on its consuming surfaces in ${profile} ${scheme}`, () => {
        const { text, surface } = createTheme({ profile, scheme }).color;
        const quiet = [surface.page, surface.raised, surface.overlay, surface.chrome, surface.subtle, surface.workspace];
        const interactive = [...quiet, surface.hover, surface.pressed, surface.selected];
        for (const foreground of [text.primary, text.secondary, text.tertiary]) {
          interactive.forEach(background => expect(contrast(foreground, background)).toBeGreaterThanOrEqual(4.6));
        }
        quiet.forEach(background => expect(contrast(text.muted, background)).toBeGreaterThanOrEqual(4.6));
        // Placeholder is a quiet hint, one step lighter than muted, yet still legible on field surfaces.
        [surface.page, surface.raised, surface.overlay, surface.hover].forEach(background => expect(contrast(text.placeholder, background)).toBeGreaterThanOrEqual(2.2));
        expect(contrast(text.primary, surface.page)).toBeGreaterThanOrEqual(7);
        expect(contrast(text.placeholder, surface.page)).toBeLessThan(contrast(text.muted, surface.page));
      });
    }
  }

  it("derives host text and surfaces from the same neutral palette", () => {
    const neutralLight = ["#ffffff", "#f0f0f0", "#e5e5e5", "#d5d5d5", "#c5c5c5", "#aaaaaa", "#808080", "#606060", "#484848", "#303030", "#101010"] as const;
    const tokens = { ...defaultBaseTokens, color: { ...defaultBaseTokens.color, neutralLight } };
    const custom = createTheme({ tokens });
    expect(custom.color.text.primary).toBe("#101010");
    expect(custom.color.text.secondary).toBe("#303030");
    expect(custom.color.text.tertiary).toBe("#484848");
    expect(custom.color.text.muted).toBe("#606060");
    expect(custom.color.text.placeholder).toBe("#808080");
    expect(custom.color.surface.chrome).toBe("#f0f0f0");
    expect(createTheme({ scheme: "dark", tokens })).toEqual(createTheme({ scheme: "dark" }));
  });

  it("projects every text role through a separately overridable CSS variable", () => {
    const theme = createTheme();
    const declarations = createThemeCssVariables(theme);
    for (const key of Object.keys(theme.color.text) as Array<keyof typeof theme.color.text>) {
      const name = themeCssVariableNames.color.text[key];
      expect(declarations[name]).toBe(theme.color.text[key]);
      expect(themeVariableReferences.color.text[key]).toBe(`var(${name})`);
    }
    expect(themeCssVariableNames.color.text.placeholder).not.toBe(themeCssVariableNames.color.text.muted);
  });
});
