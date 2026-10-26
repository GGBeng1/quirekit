import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "./config";
import { appearanceCss } from "./appearance";

describe("operating-system appearance preferences", () => {
  it("publishes preference overrides after recipes and before consumer utilities, including custom themes", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const result = await generator.generate("qk-switch__thumb bg-red-500", { preflights: true });
    expect(result.layers.indexOf("qk-preferences")).toBeGreaterThan(result.layers.indexOf("qk-recipes"));
    expect(result.layers.indexOf("qk-preferences")).toBeLessThan(result.layers.indexOf("default"));
    expect(result.getLayer("qk-preferences")).toContain("@media (forced-colors: active)");
    expect(result.getLayer("qk-preferences")).toContain("@media (prefers-reduced-motion: reduce)");
  });

  it("restricts preference changes to paint and motion rather than control geometry or forced-palette opt-outs", () => {
    const slash = appearanceCss.match(/\.qk-color-picker__trigger-none::after,\s*\.qk-color-picker__none-swatch::after\s*\{[^{}]+\}/u);
    expect(slash).not.toBeNull();
    expect(slash![0]).toContain("position: absolute");
    const declarations = [...appearanceCss.replace(slash![0], "").matchAll(/(?:\{|;)\s*([\w-]+)\s*:/gu)].map(match => match[1]);
    expect(declarations.length).toBeGreaterThan(20);
    for (const property of declarations) {
      expect([
        "color", "background-color", "border-color", "outline", "outline-color",
        "outline-offset", "outline-style", "text-decoration", "text-underline-offset",
        "transition-duration", "animation", "stroke", "box-shadow", "background-image", "forced-color-adjust"
      ]).toContain(property);
    }
    expect(appearanceCss).not.toContain("!important");
    const optOuts = [...appearanceCss.matchAll(/([^{}]+)\{\s*forced-color-adjust:\s*none;[^{}]*\}/gu)];
    expect(optOuts).toHaveLength(2);
    const inverseText = optOuts.find(match => match[0].includes("data-highlighted"))!;
    expect(inverseText[0]).toContain("background-color: CanvasText");
    expect(inverseText[0]).toContain("color: Canvas");
    const textSelectors = inverseText[1]!.trim().split(/,\s*\n/u);
    expect(textSelectors).toHaveLength(6);
    for (const selector of textSelectors) {
      expect(selector).toMatch(/\[data-(?:highlighted|selected)\]:not\(\[data-disabled\]\)/u);
      expect(selector).toMatch(/__(?:label|shortcut|description|item-label|item-description)\)?$/u);
    }
    expect(textSelectors.find(selector => selector.includes("qk-listbox__item"))).toContain(":not(.qk-preset-gallery__item)");
    const swatches = optOuts.find(match => match[0].includes("qk-color-picker__current-swatch"))!;
    expect(swatches[1]!.split(",").map(selector => selector.trim()).sort()).toEqual([
      ".qk-color-picker__current-swatch", ".qk-color-picker__swatch", ".qk-color-picker__trigger-swatch"
    ]);
  });
});
