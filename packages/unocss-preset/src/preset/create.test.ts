import { createGenerator } from "@unocss/core";
import {
  buttonVariableReferences,
  themeVariableReferences
} from "@quirekit/ui";
import { describe, expect, it } from "vitest";
import { generateQuireKitCss } from "../output/css";
import { quireKitUnoColorTokens } from "../theme/bridge";
import { defineQuireKitUnoConfig } from "./config";

describe("QuireKit UnoCSS preset", () => {
  it("reads only colon variants, so dash-named component classes generate nothing", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate("md-outline md-active-block sm-hidden md:flex", { preflights: false, safelist: false });
    expect(css).not.toMatch(/\.md-outline|\.md-active-block|\.sm-hidden/u);
    expect(css).toMatch(/\.md\\:flex\{display:flex;\}/u);
  });
  it("keeps retained primitive surfaces hidden without an application reset", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate("", { preflights: true });
    expect(css).toContain('[data-scope][hidden]:not([hidden="until-found"]) { display: none !important; }');
    expect(css).toMatch(/\.sr-only\{[^}]*position:absolute/u);
  });
  it("emits namespaced weights independently from font families", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("font-qk-menu font-qk-menu-weight font-qk-menu-metadata font-qk-menu-metadata-weight font-qk-control font-qk-helper font-qk-heading");
    expect(css).toMatch(/\.font-qk-menu\{[^}]*font-family:var\(--qk-menu-font-family\)/);
    for (const [name, variable] of [
      ['menu-weight', 'menu-font-weight'],
      ['menu-metadata-weight', 'type-helper-font-weight'],
      ['control', 'type-control-font-weight'],
      ['helper', 'type-helper-font-weight'],
      ['heading', 'type-heading-font-weight']
    ]) expect(css).toMatch(new RegExp(`\\.font-qk-${name}(?=[,{])[^{}]*\\{[^}]*font-weight:var\\(--qk-${variable}\\)`));
  });
  it("registers every semantic CSS-variable reference as an UnoCSS token", () => {
    const serializedReferences = JSON.stringify(
      themeVariableReferences.color
    );
    const declaredReferences = serializedReferences.match(
      /var\(--qk-[^)]+\)/gu
    ) ?? [];
    const unoReferences = Object.values(quireKitUnoColorTokens)
      .filter((value) => value.startsWith("var(--qk-color-"));
    expect(unoReferences).toHaveLength(
      declaredReferences.length
    );
    expect(new Set(unoReferences)).toEqual(new Set(declaredReferences));
  });

  it("registers every Button color variable as an enumerable UnoCSS token", () => {
    const declaredReferences = JSON.stringify(buttonVariableReferences).match(
      /var\(--qk-button-[^)]+\)/gu
    ) ?? [];
    const unoReferences = Object.entries(quireKitUnoColorTokens)
      .filter(([name]) => name.startsWith("qk-button-"))
      .map(([, value]) => value);

    expect(new Set(unoReferences)).toEqual(
      new Set(
        declaredReferences.filter((reference) =>
          /(?:foreground|background|border-color|focus-color)/u.test(reference)
        )
      )
    );
  });

  it("resolves typography, geometry, elevation, and layer tokens through standard utilities", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "text-qk-body leading-qk-body font-qk-product p-qk-surface rounded-qk-overlay border-qk-default shadow-qk-overlay h-qk-control-default size-qk-touch-target z-qk-modal duration-qk-overlay ease-qk-enter",
      { preflights: true }
    );
    expect(result.css).toContain("font-size:var(--qk-type-body-font-size)");
    expect(result.css).toContain("line-height:var(--qk-type-body-line-height)");
    expect(result.css).toContain("padding:var(--qk-space-surface)");
    expect(result.css).toContain("border-radius:var(--qk-radius-overlay)");
    expect(result.css).toContain("--un-shadow:var(--qk-elevation-overlay)");
    expect(result.css).toContain("height:var(--qk-control-default)");
    expect(result.css).toContain("height:var(--qk-control-touch-target)");
    expect(result.css).toContain("width:var(--qk-control-touch-target)");
    expect(result.css).toContain("transition-duration:var(--qk-motion-overlay-duration)");
    expect(result.css).toContain("transition-timing-function:var(--qk-motion-enter-easing)");
  });

  it("keeps every semantic text utility paired with its approved line height", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "text-qk-display text-qk-page-title text-qk-section-title text-qk-heading text-qk-body text-qk-compact text-qk-helper text-qk-code"
    );

    for (const role of [
      "display",
      "page-title",
      "section-title",
      "heading",
      "body",
      "compact",
      "helper",
      "code"
    ]) {
      expect(result.css).toContain(`font-size:var(--qk-type-${role}-font-size)`);
      expect(result.css).toContain(`line-height:var(--qk-type-${role}-line-height)`);
    }
  });

  it("resolves declared theme tokens through standard UnoCSS utilities", async () => {
    const config = defineQuireKitUnoConfig();
    const generator = await createGenerator(config);
    const result = await generator.generate(
      "bg-qk-surface-page text-qk-text-primary bg-qk-action-primary text-qk-action-text border-qk-border-default",
      { preflights: true }
    );
    expect(config.safelist).toContain("bg-qk-surface-page");
    expect(result.css).toContain(".bg-qk-surface-page");
    expect(result.css).toContain("background-color:var(--qk-color-surface-page)");
    expect(result.css).toContain(".text-qk-text-primary");
    expect(result.css).toContain("color:var(--qk-color-action-text)");
    expect(result.css).toContain(".border-qk-border-default");
    expect(result.css).toContain("--qk-color-surface-page");
    expect(result.css).toContain('[data-qk-theme="precision"][data-qk-scheme="dark"]');
    expect(result.css).toContain('[data-qk-theme="ink"][data-qk-scheme="light"]');
    expect(result.css).toContain('[data-qk-theme="slate"][data-qk-scheme="light"]');
    expect(result.css).toContain('[data-qk-theme="stone"][data-qk-scheme="dark"]');
  });

  it("generates a standalone stylesheet without retired token families", async () => {
    const css = await generateQuireKitCss();
    expect(css).toContain("--qk-color-surface-page");
    expect(css).toContain(".bg-qk-surface-page");
    expect(css).toContain('[data-qk-theme="ink"][data-qk-scheme="dark"]');
    expect(css).toContain(".qk-button");
    expect(css).toContain("--qk-button-sm-height");
    expect(css).not.toContain("\\[var\\(");
    expect(css).not.toContain("--qk-foundation-");
    expect(css).not.toContain("--qk-primitive-");
  });

  it("compiles Button and IconButton recipes from component theme tokens", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-button qk-button--primary-solid qk-button--primary-text qk-button--success-soft qk-button--warning-outline qk-button--sm qk-icon-button qk-icon-button--xs qk-button__icon qk-button__icon--sm",
      { preflights: true }
    );

    expect(result.css).toContain(".qk-button");
    expect(result.css).toContain("height:var(--qk-button-sm-height)");
    expect(result.css).toContain("background-color:var(--qk-button-primary-solid-background)");
    expect(result.css).toContain(".qk-button--primary-text");
    expect(result.css).toContain("background-color:var(--qk-button-success-soft-background)");
    expect(result.css).toContain("border-color:var(--qk-button-warning-border-color)");
    expect(result.css).toContain("font-weight:var(--qk-button-font-weight)");
    expect(result.css).toContain("width:var(--qk-button-xs-height)");
    expect(result.css).toContain("width:var(--qk-button-sm-icon-size)");
    expect(result.css).not.toContain("opacity:var(--qk-button-hover-opacity)");
    expect(result.css).not.toContain("opacity:var(--qk-button-pressed-opacity)");
    expect(result.css).not.toContain("--qk-button-shadow");
    expect(result.css).toContain("background-color:var(--qk-button-primary-solid-hover-background)");
    expect(result.css).toContain("background-color:var(--qk-button-primary-solid-pressed-background)");
    expect(result.css).toMatch(/\.qk-button--primary-solid:hover:enabled\{[^}]*opacity:1/);
    expect(result.css).toMatch(/\.qk-button--primary-solid:active:enabled\{[^}]*opacity:1/);
    const buttonRule = result.css.match(/\.qk-button\{[^}]+\}/u)?.[0];
    expect(buttonRule).toBeDefined();
    expect(buttonRule).not.toContain("box-shadow");
    expect(buttonRule).not.toContain("--un-ring-");
    expect(result.css).not.toContain("\\[var\\(");
  });

  it("projects overlay layers into the positioning variable owned by Ark UI", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate(
      "qk-menu__positioner qk-popover__positioner",
      { preflights: true }
    );

    expect(result.css).toContain("--z-index:calc(var(--qk-menu-layer) + var(--qk-menu-depth, 0)) !important");
    expect(result.css).toContain("--z-index:var(--qk-popover-layer) !important");
  });

  it("keeps Segmented focus visible through text emphasis without an outline or ring", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("qk-segmented__item");

    const focusedItemRule = result.css.match(
      /\.qk-segmented__item\[data-focus-visible\]\{[^}]+\}/u
    )?.[0];
    expect(focusedItemRule).toBeDefined();
    expect(focusedItemRule).toContain(
      "text-decoration-line:underline"
    );
    expect(focusedItemRule).not.toContain("outline");
    expect(focusedItemRule).not.toContain("box-shadow");
    expect(focusedItemRule).not.toContain("--un-ring-");
  });

  it("keeps the qk token namespace stable when default values are disabled", async () => {
    const generator = await createGenerator(
      defineQuireKitUnoConfig({ defaultTokens: false })
    );
    const result = await generator.generate("bg-qk-surface-page", {
      preflights: true
    });
    expect(result.css).toContain(".bg-qk-surface-page");
    expect(result.css).toContain("var(--qk-color-surface-page)");
    expect(result.css).not.toContain('[data-qk-theme="precision"]');
  });
});
