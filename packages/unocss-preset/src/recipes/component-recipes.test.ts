import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("component recipes", () => {
  it("centers Segmented icon and text slots without inline-baseline drift", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    const label = [...css.matchAll(/\.qk-segmented__label\{([^}]+)\}/gu)]
      .map(match => match[1]).join(";");

    expect(label).toContain("display:inline-flex");
    expect(label).toContain("align-items:center");
    expect(label).toContain("justify-content:center");
    expect(label).toContain("gap:0.25rem");
    const toggleContent = [...css.matchAll(/\.qk-toggle-group__content\{([^}]+)\}/gu)]
      .map(match => match[1]).join(";");
    expect(toggleContent).toContain("display:flex");
    expect(toggleContent).toContain("align-items:center");
    expect(toggleContent).toContain("justify-content:center");
  });

  it("keeps Icon geometry renderer-owned and mirrors only directional glyphs", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-icon qk-icon--12 qk-icon--16 qk-icon--20 qk-icon--24 qk-icon__svg qk-icon__accent qk-icon__accent-fill qk-icon__empty-mark",
      { preflights: true }
    );

    expect(result.css).toContain(".qk-icon");
    expect(result.css).toContain("height:16px");
    expect(result.css).toContain("width:24px");
    expect(result.css).toContain('[dir="rtl"] .qk-icon[data-mirror-rtl="true"]');
    expect(result.css).toContain("transform:scaleX(-1)");
    expect(result.css).toContain('.qk-icon[data-icon-empty="true"] .qk-icon__empty-mark');
    expect(result.css).toContain(".qk-icon__empty-mark{opacity:0;stroke:currentColor}");
    expect(result.css).not.toContain('.qk-icon[data-icon-missing="true"]');
    const iconRule = result.css.match(/\.qk-icon\{[^}]+\}/u)?.[0];
    expect(iconRule).toBeDefined();
    expect(iconRule).not.toContain("box-shadow");
    expect(iconRule).not.toContain("outline");
  });

  it("safelists Color Picker dynamic size and sidecar recipes", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain(".qk-color-picker__trigger--sm");
    expect(result.css).toContain("width:var(--qk-control-default)");
    expect(result.css).toContain(".qk-color-picker__content--editor");
    expect(result.css).toContain(".qk-color-picker__editor-panel");
    expect(result.css).toContain("@media (max-width: 640px)");
  });

  it("keeps the palette width independent of its secondary positioner", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    const editorRules = [...css.matchAll(/\.qk-color-picker__editor-panel\{([^}]+)\}/gu)].map(match => match[1]);
    expect(editorRules.some(rule => rule!.includes("position:absolute"))).toBe(false);
    expect(editorRules.some(rule => rule!.includes("flex-shrink:0"))).toBe(true);
    expect(css).not.toContain("--qk-color-picker-content-width:max-content");
    expect(css).toContain(".qk-color-picker__editor-positioner");
    expect(css).toContain("width:var(--qk-color-picker-content-width,calc(var(--qk-color-picker-columns,10) * 26px - 6px + var(--qk-space-surface) + var(--qk-space-surface)))");
    expect(css).toContain("width:var(--qk-color-picker-palette-width,100%)");
    expect(css).toContain(".qk-color-picker__content>.qk-color-picker__palette{");
    expect(css).toContain("width:min(304px,calc(100vw - 16px))!important");
  });

  it("safelists Input and InputNumber dynamic size recipes", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("");

    expect(result.css).toContain(".qk-input--sm");
    expect(result.css).toContain(".qk-input-number--md");
    expect(result.css).toContain("height:var(--qk-control-default)");
    expect(result.css).toContain("height:var(--qk-control-regular)");
    const stepperRules = [...result.css.matchAll(
      /\.qk-input-number__stepper\{[^}]+\}/gu
    )].map(match => match[0]);
    const stepperRule = stepperRules.find(rule => rule.includes("width:16px"));
    expect(stepperRule).toBeDefined();
    expect(stepperRule).toContain("width:16px");
    expect(stepperRule).toContain("border-radius:4px");
    expect(stepperRule).toContain("box-shadow:none");
    expect(stepperRule).not.toContain("--qk-elevation-raised");
    expect(result.css).toContain(
      ".qk-input-number__input::-webkit-inner-spin-button"
    );
  });

  it("leaves search cancellation to the public Input clear action", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate("qk-input__field", { safelist: false, preflights: false });

    expect(css).toContain(".qk-input__field[type=search]::-webkit-search-cancel-button{display:none;}");
    expect(css).toContain(".qk-input__field::placeholder");
    expect(css).toContain("color:var(--qk-color-text-placeholder)");
  });

  it("hides the native password reveal control with an isolated vendor selector", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate("qk-input__field", { safelist: false, preflights: true });

    expect(css).toMatch(/(?:^|[{}\n])\s*\.qk-input__field::-ms-reveal\{display:none;?\}/u);
    expect(css).toContain(".qk-input__field::placeholder");
    expect(css).toContain("color:var(--qk-color-text-placeholder)");
  });

  it("keeps Popover borderless until a border strength is requested", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-popover__content qk-popover__content--border-none qk-popover__content--border-subtle qk-popover__content--border-default qk-popover__arrow-tip qk-popover__arrow-tip--border-subtle",
      { preflights: true }
    );

    expect(result.css).toContain(".qk-popover__content");
    expect(result.css).toContain(".qk-popover__content--border-none");
    expect(result.css).toContain("border-width:0");
    expect(result.css).toContain(".qk-popover__content--border-subtle");
    expect(result.css).toContain("border-color:var(--qk-color-border-subtle)");
    expect(result.css).toContain(".qk-popover__content--border-default");
    expect(result.css).toContain("border-color:var(--qk-popover-border-color)");
    expect(result.css).toContain(".qk-popover__arrow-tip--border-subtle");
    expect(result.css).toContain("border-width:var(--qk-popover-border-width) 0 0 var(--qk-popover-border-width)");
  });

  it("anchors the Popover close button without covering content", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-popover__content qk-popover__close-trigger",
      { preflights: true }
    );

    expect(result.css).toContain("position:absolute");
    expect(result.css).toContain("right:var(--qk-popover-padding)");
    expect(result.css).toContain("top:var(--qk-popover-padding)");
    expect(result.css).toContain(":has(.qk-popover__close-trigger)");
    expect(result.css).toContain("padding-right:calc(var(--qk-popover-padding) + var(--qk-popover-close-size) + var(--qk-popover-gap))");
  });
});
