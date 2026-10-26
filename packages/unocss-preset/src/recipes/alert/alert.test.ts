import { createGenerator } from "@unocss/core";
import type { Theme } from "@unocss/preset-wind3";
import { presetWind3 } from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import { quireKitUnoTheme } from "../../theme/bridge";
import { alertRecipeCatalog, alertShortcuts } from "./alert";

describe("Alert recipe", () => {
  it("binds neutral solid alerts to the inverse surface independently of primary text", async () => {
    const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: alertShortcuts });
    const { css, matched } = await generator.generate("qk-alert--neutral qk-alert--solid bg-qk-surface-inverse");
    expect(matched.has("bg-qk-surface-inverse")).toBe(true);
    expect(css).toContain("background-color:var(--qk-color-surface-inverse)");
    expect(css).toMatch(/\.qk-alert--neutral\{[^}]*--qk-alert-solid:var\(--qk-color-surface-inverse\)/u);
    expect(css).toMatch(/\.qk-alert--solid\{[^}]*background-color:var\(--qk-alert-solid\)/u);
    expect(css).not.toContain("--qk-color-text-primary");
  });

  it("emits every family and appearance using existing semantic colors", async () => {
    const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: alertShortcuts });
    const { css, matched } = await generator.generate(alertRecipeCatalog.join(" "));
    for (const name of alertRecipeCatalog) expect(matched.has(name)).toBe(true);
    expect(css).toContain("var(--qk-color-warning-text)");
    expect(css).toContain("var(--qk-color-warning-on-solid)");
    expect(css).toContain("var(--qk-color-action-soft)");
    expect(css).toContain("var(--qk-color-success-pressed-surface)");
    expect(css).toContain("overflow-wrap:anywhere");
    expect(css).toContain("flex-wrap:wrap");
    expect(css).toContain("color:inherit !important");
    expect(css.split("/* layer: qk-recipes */")[1]).not.toMatch(/#[0-9a-f]{3,8}\b/i);
  });
});
