import { describe, expect, it } from "vitest";
import { createTheme } from "./create";
import { createButtonTokens } from "../components/button/create";
import { defaultBaseTokens, parseQuireHexColor, quireContrastRatio, quireSrgbToOklch } from "../tokens";

/** @param foreground - Opaque text. @param background - Opaque surface. @returns WCAG contrast ratio. */
function contrast(foreground: string, background: string): number {
  return quireContrastRatio(parseQuireHexColor(foreground), parseQuireHexColor(background));
}

/** @param hex - Serialized palette color. @returns Cartesian OKLab coordinates for perceptual distances. */
function perceptualCoordinates(hex: string): readonly number[] {
  const color = quireSrgbToOklch(parseQuireHexColor(hex));
  const hue = color.h * Math.PI / 180;
  return [color.l, color.c * Math.cos(hue), color.c * Math.sin(hue)];
}

describe("reviewed color pairings", () => {
  it("keeps neutral ramps ordered with a visible second surface step", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const lightness = Object.values(theme.scales.neutral).map(hex => quireSrgbToOklch(parseQuireHexColor(hex)).l);
        for (let index = 1; index < lightness.length; index += 1) {
          const difference = lightness[index]! - lightness[index - 1]!;
          expect(scheme === "light" ? -difference : difference).toBeGreaterThan(scheme === "light" && index < 3 ? 0.008 : 0.015);
        }
        if (scheme === "light") {
          // Surface steps should be discoverable without imposing a large uniform text-scale gap.
          expect(contrast(theme.scales.neutral[2], theme.scales.neutral[1])).toBeGreaterThan(1.02);
          expect(contrast(theme.scales.neutral[3], theme.scales.neutral[1])).toBeLessThan(1.16);
          expect(contrast(theme.scales.neutral[4], theme.scales.neutral[1])).toBeLessThan(1.25);
        }
      }
    }
  });

  it("keeps cool light surfaces low-chroma without weakening text roles", () => {
    for (const profile of ["precision", "slate"] as const) {
      const theme = createTheme({ profile, scheme: "light" });
      for (const step of [3, 4, 5, 6] as const) {
        const color = quireSrgbToOklch(parseQuireHexColor(theme.scales.neutral[step]));
        expect(color.c, `${profile} neutral.${step} should remain a restrained cool gray`).toBeLessThan(profile === "precision" ? 0.016 : 0.012);
        if (profile === "precision") {
          expect(color.c, `neutral.${step} must retain its blue identity`).toBeGreaterThan(0.007);
          expect(color.h).toBeGreaterThan(250);
          expect(color.h).toBeLessThan(270);
        }
      }
      expect(quireSrgbToOklch(parseQuireHexColor(theme.scales.neutral[5])).l).toBeGreaterThan(0.91);
      expect(quireSrgbToOklch(parseQuireHexColor(theme.scales.neutral[6])).l).toBeGreaterThan(0.81);
      expect(theme.color.surface.hover).toBe(theme.scales.neutral[3]);
      expect(theme.color.surface.selected).toBe(theme.scales.neutral[4]);
      expect(theme.color.surface.pressed).toBe(theme.scales.neutral[5]);
      for (const background of [theme.color.surface.hover, theme.color.surface.selected, theme.color.surface.pressed]) {
        expect(contrast(theme.color.text.primary, background)).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("joins the neutral boundary and text ranges without a lightness or chroma seam", () => {
    for (const profile of ["precision", "slate"] as const) {
      const ramp = createTheme({ profile, scheme: "light" }).scales.neutral;
      const colors = Object.values(ramp).slice(4).map(hex => quireSrgbToOklch(parseQuireHexColor(hex)));
      const gaps = colors.slice(1).map((color, index) => colors[index]!.l - color.l);
      // The boundary-to-text transition shares one curve; no isolated step can absorb the change.
      expect(Math.max(...gaps)).toBeLessThan(0.145);
      for (let index = 1; index < gaps.length; index += 1) {
        expect(Math.max(gaps[index]!, gaps[index - 1]!) / Math.min(gaps[index]!, gaps[index - 1]!)).toBeLessThan(1.5);
      }
      for (let index = 1; index < colors.length; index += 1) {
        expect(colors[index]!.c).toBeLessThan(profile === "precision" ? 0.04 : 0.016);
        expect(Math.abs(colors[index]!.c - colors[index - 1]!.c)).toBeLessThan(0.007);
      }
      if (profile === "precision") {
        // Deep blue-gray needs more chroma than pale surfaces to preserve its identity.
        const deep = colors.slice(2);
        expect(deep[0]!.c).toBeGreaterThan(0.018);
        expect(deep.at(-1)!.c).toBeGreaterThan(0.03);
        deep.forEach((color, index) => {
          expect(color.h).toBeGreaterThan(250);
          expect(color.h).toBeLessThan(270);
          if (index > 0) expect(color.c).toBeGreaterThan(deep[index - 1]!.c);
        });
      }
    }
  });

  it("distributes perceptual changes across the entire surface-to-source range", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      for (const family of ["primary", "info", "success", "warning", "danger"] as const) {
        const colors = Object.values(theme.scales[family]).slice(0, 6).map(perceptualCoordinates);
        const distances = colors.slice(1).map((color, index) => Math.hypot(...color.map((channel, axis) => channel - colors[index]![axis]!)));
        const average = distances.reduce((sum, value) => sum + value, 0) / distances.length;
        expect(Math.min(...distances), `${scheme} ${family} compressed steps`).toBeGreaterThan(average * 0.45);
        expect(Math.max(...distances), `${scheme} ${family} abrupt step`).toBeLessThan(average * 1.75);
      }
    }
  });

  it("keeps chromatic endpoints useful as tinted surfaces and deep accents", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      for (const family of ["primary", "info", "success", "warning", "danger"] as const) {
        const scale = theme.scales[family];
        const colors = Object.values(scale).map(hex => quireSrgbToOklch(parseQuireHexColor(hex)));
        const first = colors[0]!;
        const last = colors[10]!;
        expect(scale[6]).toBe(theme.sources[family]);
        for (let index = 1; index < colors.length; index += 1) {
          if (scheme === "light") expect(colors[index]!.l).toBeLessThan(colors[index - 1]!.l);
          else expect(colors[index]!.l).toBeGreaterThan(colors[index - 1]!.l);
        }
        if (scheme === "light") {
          expect(first.l, `${family} tinted surface`).toBeLessThan(0.99);
          expect(first.c).toBeGreaterThan(0.01);
          expect(last.l, `${family} deep accent`).toBeGreaterThan(0.3);
          expect(last.c).toBeGreaterThan(0.07);
        } else {
          const page = quireSrgbToOklch(parseQuireHexColor(theme.color.surface.page));
          expect(first.l, `${family} surface above the page`).toBeGreaterThan(page.l);
          expect(first.c).toBeGreaterThan(0.02);
        }
        expect(contrast(scale[11], scale[1]), `${scheme} ${family} endpoint pairing`).toBeGreaterThanOrEqual(4.5);
      }
    }
  });

  it("reuses reviewed ramps across roles without applying them to custom sources", () => {
    const base = createTheme();
    const selected = createTheme({ sources: { primary: "#F3A21A" } });
    expect(selected.scales.primary).toEqual(base.scales.warning);
    expect(selected.scales.primary[6]).toBe("#f3a21a");
    expect(selected.color.action.text).toBe(base.color.warning.text);
    const custom = createTheme({ sources: { warning: "#f3a21b" } });
    expect(custom.scales.warning[6]).toBe("#f3a21b");
    expect(custom.scales.warning[9]).not.toBe(base.scales.warning[9]);
  });

  it("keeps every offered source readable on neutral and Soft surfaces", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        for (const source of Object.values(defaultBaseTokens.color.source)) {
          const theme = createTheme({ profile, scheme, sources: { primary: source } });
          const button = createButtonTokens(theme).color.primary;
          const backgrounds = [theme.color.surface.page, theme.color.surface.chrome, theme.color.surface.hover, button.softBackground, button.softHoverBackground, button.softPressedBackground];
          if (scheme === "light") backgrounds.push("#ffffff");
          for (const background of backgrounds) {
            expect(contrast(button.foreground, background), `${scheme} ${profile} ${source} on ${background}`).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("uses palette tokens and readable text for every soft state in both schemes", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const buttons = createButtonTokens(theme);
        for (const foreground of [theme.color.action.text, theme.color.info.text, theme.color.success.text, theme.color.warning.text, theme.color.danger.text]) {
          expect(contrast(foreground, theme.color.surface.selected), "progress indicator on its track").toBeGreaterThanOrEqual(3);
        }
        for (const family of ["neutral", "primary", "info", "success", "warning", "danger"] as const) {
          const color = buttons.color[family];
          if (scheme === "dark") {
            expect(quireSrgbToOklch(parseQuireHexColor(color.softBackground)).l).toBeGreaterThan(quireSrgbToOklch(parseQuireHexColor(theme.color.surface.page)).l);
          }
          const ramp = family === "primary" && profile === "ink" ? theme.scales.neutral : theme.scales[family];
          for (const background of [color.softBackground, color.softHoverBackground, color.softPressedBackground]) {
            expect(Object.values(ramp)).toContain(background);
            expect(contrast(color.foreground, background), `${scheme} ${family} on ${background}`).toBeGreaterThanOrEqual(4.5);
          }
          for (const background of [color.solidBackground, color.solidHoverBackground, color.solidPressedBackground]) {
            expect(Object.values(ramp)).toContain(background);
            expect(contrast(color.solidForeground, background)).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });
});
