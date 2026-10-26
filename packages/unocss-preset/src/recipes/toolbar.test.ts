import { createGenerator } from "@unocss/core";
import { presetWind3, type Theme } from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import { quireKitUnoTheme } from "../theme/bridge";
import { toolbarShortcuts } from "./toolbar";

describe("Toolbar recipe", () => {
  it("stacks explicit rows without giving each row a separate surface", async () => {
    const generator = await createGenerator({ presets: [presetWind3()], theme: quireKitUnoTheme as Theme, shortcuts: toolbarShortcuts });
    const { css } = await generator.generate("qk-toolbar__content--rows qk-toolbar__row");
    expect(css).toContain("flex-direction:column");
    expect(css).toContain("align-items:stretch");
    expect(css).toContain("gap:var(--qk-space-inline-tight)");
    expect(css).toContain("flex-wrap:nowrap");
    expect(css).not.toContain("background");
    expect(css).not.toContain("box-shadow");
  });

  it("outlines value selectors like form fields while other items keep a transparent border", async () => {
    const generator = await createGenerator({ presets: [presetWind3()], theme: quireKitUnoTheme as Theme, shortcuts: toolbarShortcuts });
    const { css } = await generator.generate("qk-toolbar__item");
    expect(css).toMatch(/\.qk-toolbar__item\[data-kind=selector\]\{[^}]*border-color:var\(--qk-color-border-default\)/u);
    expect(css).toMatch(/\.qk-toolbar__item\[data-state=open\]\[data-kind=selector\]\{[^}]*border-color:var\(--qk-color-border-strong\)/u);
    expect(css).toMatch(/\.qk-toolbar__item\[data-kind=selector\]\{[^}]*justify-content:space-between[^}]*background-color:var\(--qk-color-surface-page\)/u);
    expect(css).toContain(".qk-toolbar__item[data-kind=selector]>.qk-toolbar__label{min-width:0;flex:1 1 0%;text-align:start;}");
    expect(css).toContain("border-color:transparent");
  });

  it("renders the outlined surface with a real border and no shadow", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      theme: quireKitUnoTheme as Theme,
      shortcuts: toolbarShortcuts
    });
    const { css } = await generator.generate("qk-toolbar qk-toolbar--outlined");
    expect(css).toContain("border-style:solid");
    expect(css).toContain("border-color:var(--qk-color-border-subtle)");
    expect(css).toContain("box-shadow:none");
  });

  it("centers fitting content and gives icon-only split targets the same outer geometry as actions", async () => {
    const generator = await createGenerator({ presets: [presetWind3()], theme: quireKitUnoTheme as Theme, shortcuts: toolbarShortcuts });
    const { css } = await generator.generate("qk-toolbar--align-center qk-toolbar--align-start qk-toolbar__item qk-toolbar__split-target qk-toolbar__split-target--icon qk-toolbar__field qk-toolbar__icon qk-toolbar__indicator");
    expect(css).toContain("justify-content:center");
    expect(css).toContain(".qk-toolbar--align-center[data-overflowing=true]");
    expect(css).toContain("justify-content:flex-start");
    expect(css).toContain(".qk-toolbar__split-target--icon.qk-toolbar__split-target--icon{padding:0");
    expect(css).toMatch(/\.qk-toolbar__split-target--icon\{[^}]*width:var\(--qk-toolbar-item-height\)/u);
    expect(css).toMatch(/\.qk-toolbar__field\{[^}]*height:var\(--qk-toolbar-item-height\)/u);
    expect(css).toContain("box-sizing:border-box");
    expect(css).toContain(".qk-toolbar__icon>*");
  });

  it("owns one non-shrinking scroll row with optional native scrollbar and token-sized arrows", async () => {
    const generator = await createGenerator({ presets: [presetWind3()], theme: quireKitUnoTheme as Theme, shortcuts: toolbarShortcuts });
    const result = await generator.generate("qk-toolbar__viewport qk-toolbar__viewport--hidden qk-toolbar__viewport--auto qk-toolbar__viewport--visible qk-toolbar__content qk-toolbar__content--visible qk-toolbar__scroll-button");
    expect(result.css).toContain("overflow-x:auto");
    expect(result.css).toMatch(/\.qk-toolbar__viewport\{[^}]*position:relative/u);
    expect(result.css).toContain("scrollbar-width:none");
    expect(result.css).toContain("scrollbar-width:auto");
    expect(result.css).toContain("::-webkit-scrollbar");
    expect(result.css).toContain("flex-wrap:nowrap");
    expect(result.css).toContain("flex-shrink:0");
    expect(result.css).toContain("justify-content:inherit");
    expect(result.css).toContain("width:var(--qk-toolbar-split-disclosure-width)");
    expect(result.css).toContain(".qk-toolbar__viewport--visible.qk-toolbar__viewport--visible");
    expect(result.css).toContain(".qk-toolbar__content--visible.qk-toolbar__content--visible");
    expect(result.css).toContain("display:contents");
  });

  it("compiles action, toggle, disclosure, group, and separator states", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      theme: quireKitUnoTheme as Theme,
      shortcuts: toolbarShortcuts
    });
    const result = await generator.generate(
      "qk-toolbar qk-toolbar--horizontal qk-toolbar--vertical qk-toolbar__group qk-toolbar__group--horizontal qk-toolbar__group--vertical qk-toolbar__item qk-toolbar__icon-button qk-toolbar__disclosure qk-toolbar__icon qk-toolbar__label qk-toolbar__indicator qk-toolbar__split qk-toolbar__split-target qk-toolbar__split-disclosure qk-toolbar__separator qk-toolbar__separator--vertical qk-toolbar__separator--horizontal"
    );

    expect(result.css).toContain(".qk-toolbar");
    expect(result.css).toContain("height:var(--qk-toolbar-item-height)");
    expect(result.css).toContain("cursor:not-allowed");
    expect(result.css).toContain("background-color:var(--qk-toolbar-hover-background)");
    expect(result.css).toContain("background-color:var(--qk-toolbar-selected-background)");
    expect(result.css).not.toContain("border-color:var(--qk-toolbar-focus-border)");
    expect(result.css).toContain("width:var(--qk-toolbar-item-height)");
    expect(result.css).toContain("height:var(--qk-toolbar-icon-size)");
    expect(result.css).toContain("width:var(--qk-toolbar-split-disclosure-width)");
    expect(result.css).toContain("min-width:var(--qk-toolbar-split-disclosure-width)");
    expect(result.css).toContain("max-width:var(--qk-toolbar-split-disclosure-width)");
    expect(result.css).toContain("flex-basis:var(--qk-toolbar-split-disclosure-width)");
    expect(result.css).toContain("border-start-end-radius:0");
    expect(result.css).toContain("border-end-start-radius:0");
  });

  it("uses the existing background for focus and never emits outline, ring, or shadow", async () => {
    const generator = await createGenerator({
      presets: [presetWind3()],
      theme: quireKitUnoTheme as Theme,
      shortcuts: toolbarShortcuts
    });
    const result = await generator.generate(
      "qk-toolbar qk-toolbar__item qk-toolbar__icon-button"
    );
    const itemRule = result.css.match(/\.qk-toolbar__item\{[^}]+\}/u)?.[0];
    const focusRule = result.css.match(
      /\.qk-toolbar__item:focus-visible\{[^}]+\}/u
    )?.[0];

    expect(itemRule).toBeDefined();
    expect(itemRule).toContain("box-sizing:border-box");
    expect(itemRule).toContain("box-shadow:none");
    expect(itemRule).toContain("outline:0");
    expect(itemRule).not.toContain("--un-ring-");
    expect(focusRule).toContain("background-color:var(--qk-toolbar-hover-background)");
    expect(focusRule).not.toContain("border-color");
    expect(focusRule).not.toContain("box-shadow");
    expect(focusRule).not.toContain("outline");
  });
});
