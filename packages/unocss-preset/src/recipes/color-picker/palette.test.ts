import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";

describe("ColorPicker palette focus", () => {
  it("paints keyboard focus inside existing color targets without moving swatches", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("", { preflights: true });
    const focus = css.match(/\.qk-color-picker__swatch-trigger:focus-visible\{[^}]+\}/u)?.[0];
    expect(focus).toContain("transform:scale(0.85)");
    expect(focus).not.toMatch(/padding|border|outline|shadow|width|height/);
    expect(css).not.toContain(".qk-color-picker__swatch-trigger:focus-visible::after");
    expect(css).toMatch(/\.qk-color-picker__swatch-trigger:disabled\{[^}]*cursor:not-allowed/);
    const hover = css.match(/\.qk-color-picker__reset(?=[^,{]*:hover)[^,{]*/u)?.[0];
    expect(hover).toContain(":enabled");
  });

  it("keeps modal-owned popups above their parent and below the dedicated Tooltip layer", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("", { preflights: true });
    expect(css).toContain("--qk-color-picker-layer:calc(var(--qk-layer-modal) + 1)");
    expect(css).toContain("--qk-popover-layer:calc(var(--qk-layer-modal) + 1)");
    expect(css).toContain("z-index:var(--qk-color-picker-layer,var(--qk-layer-overlay))");
    expect(css).toContain("--z-index:var(--qk-color-picker-layer,var(--qk-layer-overlay)) !important");
    expect(css).toContain("z-index:var(--qk-tooltip-layer)");
  });
});
