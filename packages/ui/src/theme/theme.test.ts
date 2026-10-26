import { describe, expect, it } from "vitest";
import {
  parseQuireHexColor,
  quireContrastRatio,
  quireKitColorSteps,
  quireSrgbToOklch,
  defaultBaseTokens,
  resolveQuireKitNeutralScale
} from "../tokens";
import { createTheme } from "./create";
import {
  createThemeCssVariables,
  themeCssVariableNames,
  themeVariableReferences
} from "./variables";

describe("QuireKit semantic themes", () => {
  it("keeps light interaction surfaces ordered within the quiet neutral steps", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      const theme = createTheme({ profile });
      expect(theme.color.surface.hover).toBe(theme.scales.neutral[3]);
      expect(theme.color.surface.selected).toBe(theme.scales.neutral[4]);
      expect(theme.color.surface.pressed).toBe(theme.scales.neutral[5]);
    }
  });
  it("compiles stable eleven-step solid and alpha scales from arbitrary primary sources", () => {
    const first = createTheme({
      scheme: "light",
      sources: { primary: "#13c2c2" }
    });
    const second = createTheme({
      scheme: "light",
      sources: { primary: "#13c2c2" }
    });
    expect(Object.keys(first.scales.primary)).toHaveLength(11);
    expect(Object.keys(first.alphaScales.primary)).toHaveLength(11);
    expect(first.scales.primary).toEqual(second.scales.primary);
    expect(first.alphaScales.primary).toEqual(second.alphaScales.primary);
    expect(
      quireContrastRatio(
        parseQuireHexColor(first.scales.primary[8]),
        parseQuireHexColor(first.scales.primary[1])
      )
    ).toBeGreaterThanOrEqual(defaultBaseTokens.color.minimumSolidContrast);
  });

  it("reverse-composites every non-transparent alpha step back to its solid role", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      const background = parseQuireHexColor(theme.scales.neutral[1]);
      for (const family of ["neutral", "primary", "info", "success", "warning", "danger"] as const) {
        for (const step of quireKitColorSteps.slice(1)) {
          const match = theme.alphaScales[family][step].match(
            /^rgb\((\d+) (\d+) (\d+) \/ (\d+)%\)$/u
          );
          expect(match).not.toBeNull();
          const alpha = Number(match![4]) / 100;
          const target = parseQuireHexColor(theme.scales[family][step]);
          for (const [channel, value] of [["r", match![1]], ["g", match![2]], ["b", match![3]]] as const) {
            const composed = (Number(value) / 255) * alpha + background[channel] * (1 - alpha);
            expect(Math.abs(composed - target[channel])).toBeLessThanOrEqual(2 / 255);
          }
        }
      }
    }
  });

  it("anchors the reviewed source and keeps perceptual lightness monotonic", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      expect(theme.scales.primary[6]).toBe(defaultBaseTokens.color.source.cobalt);
      expect(theme.color.action.primary).toBe(defaultBaseTokens.color.source.cobalt);
      const lightness = Object.values(theme.scales.primary).map((value) =>
        quireSrgbToOklch(parseQuireHexColor(value)).l
      );
      for (let index = 1; index < lightness.length; index += 1) {
        if (scheme === "light") expect(lightness[index]!).toBeLessThan(lightness[index - 1]!);
        else expect(lightness[index]!).toBeGreaterThan(lightness[index - 1]!);
      }
    }
  });

  it("keeps neutral surfaces distinct and ordered across all profiles", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const lightness = Object.values(theme.scales.neutral).map(value => quireSrgbToOklch(parseQuireHexColor(value)).l);
        for (let index = 1; index < lightness.length; index++) {
          expect((lightness[index - 1]! - lightness[index]!) * (scheme === "light" ? 1 : -1)).toBeGreaterThan(0);
        }
        if (scheme === "light") {
          // Step two must receive a meaningful share of the quiet-surface interval.
          expect((lightness[0]! - lightness[1]!) / (lightness[0]! - lightness[2]!)).toBeGreaterThanOrEqual(0.35);
        }
      }
    }
  });

  it("uses the manually reviewed neutral palette instead of generating it", () => {
    const theme = createTheme({ scheme: "dark" });
    expect(theme.scales.neutral).toEqual(
      resolveQuireKitNeutralScale("dark", defaultBaseTokens.color)
    );
    const ink = createTheme({ profile: "ink", scheme: "light" });
    expect(ink.scales.neutral).toEqual(
      resolveQuireKitNeutralScale("light", defaultBaseTokens.color, "ink")
    );
  });

  it("uses precision and ink as separate theme profiles", () => {
    const precision = createTheme({ profile: "precision" });
    const ink = createTheme({ profile: "ink" });
    expect(precision.profile).toBe("precision");
    expect(ink.profile).toBe("ink");
    expect(precision.sources.primary).toBe(defaultBaseTokens.color.source.cobalt);
    expect(ink.sources.primary).toBe(defaultBaseTokens.color.source.ink);
    expect(precision.color.action.primary).not.toBe(ink.color.action.primary);
    expect(ink.color.action.primary).toBe(ink.scales.neutral[11]);
    expect(ink.color.action.foreground).toBe("#ffffff");
  });

  it("configures the primary source independently from the neutral profile", () => {
    const theme = createTheme({
      profile: "ink",
      sources: { primary: defaultBaseTokens.color.source.violet }
    });
    expect(theme.scales.neutral).toEqual(
      resolveQuireKitNeutralScale("light", defaultBaseTokens.color, "ink")
    );
    expect(theme.sources.primary).toBe(defaultBaseTokens.color.source.violet);
    expect(theme.color.action.primary).toBe(defaultBaseTokens.color.source.violet);
    expect(theme.color.border.focus).toBe(theme.color.action.text);
  });

  it("uses reviewed vivid sources for the four feedback families", () => {
    expect(defaultBaseTokens.color.source).toMatchObject({
      blue: "#0e6ee6",
      green: "#008847",
      amber: "#f3a21a",
      red: "#de2852"
    });
    const theme = createTheme();
    expect(theme.scales.info[6]).toBe("#0e6ee6");
    expect(theme.scales.success[6]).toBe("#008847");
    expect(theme.scales.warning[6]).toBe("#f3a21a");
    expect(theme.scales.danger[6]).toBe("#de2852");
  });

  it("separates vivid fills from existing readable text tokens", () => {
    const light = createTheme();
    expect(light.color.action.text).toBe(light.scales.primary[8]);
    for (const family of ["info", "success", "danger"] as const) {
      expect(light.color[family].text).toBe(light.scales[family][8]);
    }
    expect(light.color.warning.text).toBe(light.scales.warning[10]);
    for (const scheme of ["light", "dark"] as const) {
      for (const sources of [undefined, { primary: "#f3a21a", warning: "#0e6ee6", success: "#bef264" }]) {
        const theme = createTheme({ scheme, sources });
        expect(theme.color.action.primary).toBe(theme.scales.primary[6]);
        expect(Object.values(theme.scales.primary)).toContain(theme.color.action.text);
        for (const family of ["info", "success", "warning", "danger"] as const) {
          expect(Object.values(theme.scales[family])).toContain(theme.color[family].foreground);
          if (scheme === "dark" && sources === undefined) expect(theme.color[family].text).toBe(theme.scales[family][9]);
          for (const background of [theme.color[family].surface, theme.color[family].hoverSurface, theme.color[family].pressedSurface]) {
            expect(quireContrastRatio(parseQuireHexColor(theme.color[family].text), parseQuireHexColor(background))).toBeGreaterThanOrEqual(4.5);
          }
        }
      }
    }
  });

  it("keeps the first neighbor close to source without muting its chroma", () => {
    const theme = createTheme({ scheme: "light" });
    const source = quireSrgbToOklch(parseQuireHexColor(theme.scales.primary[6]));
    const neighbor = quireSrgbToOklch(parseQuireHexColor(theme.scales.primary[7]));
    expect(source.l - neighbor.l).toBeGreaterThan(0);
    expect(source.l - neighbor.l).toBeLessThan(0.05);
    expect(Math.abs(source.c - neighbor.c)).toBeLessThan(0.015);
  });

  it("selects readable accent text against the strongest Soft surface", () => {
    const light = createTheme({ scheme: "light" });
    expect(light.color.action.text).toBe(light.scales.primary[8]);
    expect(quireContrastRatio(parseQuireHexColor(light.color.action.text), parseQuireHexColor(light.color.action.softPressed))).toBeGreaterThanOrEqual(4.5);
  });

  it("prefers readable white solid labels while retaining dark labels for bright fills", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      expect(theme.color.success.onSolid).toBe("#ffffff");
      expect(theme.color.warning.onSolid).toBe("#000000");
      for (const family of ["info", "success", "warning", "danger"] as const) {
        expect(quireContrastRatio(
          parseQuireHexColor(theme.color[family].onSolid),
          parseQuireHexColor(theme.color[family].solid)
        )).toBeGreaterThanOrEqual(4.5);
      }
      const custom = createTheme({ scheme, sources: { success: "#bef264", warning: "#92400e", primary: "#198754" } });
      expect(custom.color.success.onSolid).toBe("#000000");
      expect(custom.color.warning.onSolid).toBe("#ffffff");
      expect(custom.color.action.foreground).toBe("#ffffff");
    }
  });

  it("keeps quiet feedback foregrounds readable", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      for (const family of ["info", "success", "warning", "danger"] as const) {
        for (const background of [theme.color[family].surface, theme.color[family].hoverSurface, theme.color[family].pressedSurface]) {
          expect(
            quireContrastRatio(
              parseQuireHexColor(theme.color[family].foreground),
              parseQuireHexColor(background)
            )
          ).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps neutral-surface accents at source six in light mode without inheriting Soft text", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme, sources: { primary: "#425be1" } });
        expect(theme.color.text.accent).toBe(theme.scales.primary[scheme === "light" ? 6 : 9]);
        for (const background of [theme.color.surface.page, theme.color.surface.overlay, theme.color.surface.hover]) {
          expect(quireContrastRatio(parseQuireHexColor(theme.color.text.accent), parseQuireHexColor(background))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
    expect(createTheme({ profile: "ink" }).color.text.accent).toBe(createTheme({ profile: "ink" }).color.action.primary);
  });

  it("keeps supporting text distinct and readable across neutral interaction surfaces", () => {
    for (const scheme of ["light", "dark"] as const) {
      for (const profile of ["precision", "ink", "slate", "stone"] as const) {
        const theme = createTheme({ scheme, profile });
        expect(theme.color.text.tertiary).not.toBe(theme.color.text.secondary);
        for (const background of [theme.color.surface.page, theme.color.surface.overlay, theme.color.surface.subtle, theme.color.surface.hover, theme.color.surface.selected, theme.color.surface.pressed]) {
          expect(quireContrastRatio(parseQuireHexColor(theme.color.text.tertiary), parseQuireHexColor(background))).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });

  it("keeps dark feedback surfaces chromatic instead of collapsing into black", () => {
    const dark = createTheme({ scheme: "dark" });

    expect(dark.color.surface.hover).not.toBe(dark.color.surface.overlay);
    for (const family of ["info", "success", "warning", "danger"] as const) {
      expect(dark.color[family].surface).toBe(dark.scales[family][1]);
      expect(dark.color[family].hoverSurface).toBe(dark.scales[family][2]);
      expect(dark.color[family].pressedSurface).toBe(dark.scales[family][3]);
      expect(
        quireContrastRatio(
          parseQuireHexColor(dark.color[family].foreground),
          parseQuireHexColor(dark.color[family].pressedSurface)
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("selects readable content independently for every solid feedback source", () => {
    const theme = createTheme({ scheme: "light" });
    for (const family of ["info", "success", "warning", "danger"] as const) {
      expect(
        quireContrastRatio(
          parseQuireHexColor(theme.color[family].onSolid),
          parseQuireHexColor(theme.color[family].solid)
        )
      ).toBeGreaterThanOrEqual(4.5);
    }
  });

  it("maps semantic roles from the source-centered scale", () => {
    for (const scheme of ["light", "dark"] as const) {
      const theme = createTheme({ scheme });
      expect(theme.color.action.primary).toBe(theme.scales.primary[6]);
      expect(theme.color.border.focus).toBe(theme.scales.primary[scheme === "light" ? 8 : 9]);
      expect(theme.color.text.secondary).toBe(theme.scales.neutral[10]);
      for (const family of ["info", "success", "warning", "danger"] as const) {
        expect(theme.color[family].solid).toBe(theme.scales[family][6]);
      }
    }
  });

  it("projects only explicitly declared semantic CSS variables", () => {
    const variables = createThemeCssVariables(createTheme());
    expect(Object.keys(variables)).toHaveLength(167);
    expect(variables).toHaveProperty(
      themeCssVariableNames.color.surface.workspace
    );
    expect(variables).toHaveProperty(
      themeCssVariableNames.typography.body.fontSize,
      "14px"
    );
    expect(variables).toHaveProperty(themeCssVariableNames.control.default, "28px");
    expect(variables).toHaveProperty(themeCssVariableNames.control.touchTarget, "44px");
    expect(JSON.stringify(themeVariableReferences)).not.toContain(
      "qk-foundation"
    );
    expect(JSON.stringify(themeVariableReferences)).not.toContain(
      "qk-primitive"
    );
  });

  it("maps numeric base scales into semantic interaction roles", () => {
    const light = createTheme({ scheme: "light" });
    const dark = createTheme({ scheme: "dark" });
    expect(light.control).toMatchObject({ compact: "24px", default: "28px", regular: "32px", comfortable: "36px", large: "40px", touchTarget: "44px" });
    expect(light.opacity).toEqual({ transparent: 0, disabled: 0.42, muted: 0.68, drag: 0.78, pressed: 0.88, hover: 0.94, opaque: 1 });
    expect(light.layer).toEqual({ base: 0, chrome: 100, overlay: 1000, modal: 1100, toast: 1200, tooltip: 1300 });
    expect(light.elevation.overlay).not.toBe(dark.elevation.overlay);
    expect(dark.elevation.overlay).toContain("255 255 255");
    expect(light.color.surface.scrim).toBe("rgb(18 28 44 / 42%)");
    expect(dark.color.surface.scrim).toBe("rgb(13 17 23 / 68%)");
    expect(light.color.surface.transparent).toContain("/ 0%");
    expect(light.color.selection.document).toMatch(/\/ (?:1[0-9]|2[0-9]|3[0-9]|4[0-2])%\)/u);
    expect(light.color.selection.remote).toMatch(/\/ (?:1[0-9]|2[0-9]|3[0-9]|4[0-2])%\)/u);
    expect(light.color.selection.dropTarget).toMatch(/\/ (?:1[0-9]|2[0-9]|3[0-9]|4[0-2])%\)/u);
  });

  it("keeps readable text, feedback, actions, and focus boundaries in every theme", () => {
    for (const profile of ["precision", "ink", "slate", "stone"] as const) {
      for (const scheme of ["light", "dark"] as const) {
        const theme = createTheme({ profile, scheme });
        const contrast = (foreground: string, background: string): number =>
          quireContrastRatio(parseQuireHexColor(foreground), parseQuireHexColor(background));
        expect(contrast(theme.color.text.primary, theme.color.surface.page)).toBeGreaterThanOrEqual(7);
        expect(contrast(theme.color.text.secondary, theme.color.surface.page)).toBeGreaterThanOrEqual(7);
        expect(contrast(theme.color.action.text, theme.color.surface.page)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.color.action.foreground, theme.color.action.primary)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.color.action.foreground, theme.color.action.hover)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.color.action.foreground, theme.color.action.pressed)).toBeGreaterThanOrEqual(4.5);
        expect(contrast(theme.color.border.focus, theme.color.surface.page)).toBeGreaterThanOrEqual(3);
        for (const feedback of [theme.color.info, theme.color.success, theme.color.warning, theme.color.danger]) {
          expect(contrast(feedback.text, theme.color.surface.overlay)).toBeGreaterThanOrEqual(4.5);
          expect(contrast(feedback.foreground, feedback.surface)).toBeGreaterThanOrEqual(4.5);
        }
      }
    }
  });
});
