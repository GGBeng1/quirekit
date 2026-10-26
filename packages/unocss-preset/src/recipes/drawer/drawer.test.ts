import { createGenerator } from "@unocss/core";
import presetWind3, { type Theme } from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import { drawerRecipeCatalog, drawerShortcuts, drawerStaticCss } from ".";
import { quireKitUnoTheme } from "../../theme/bridge";

describe("drawer recipe", () => {
  it("publishes logical sides, fixed sizes, and independently scrolling body anatomy", () => {
    const shortcuts = JSON.stringify(drawerShortcuts);

    expect(drawerRecipeCatalog).toContain("qk-drawer__content--start");
    expect(drawerRecipeCatalog).toContain("qk-drawer__content--end");
    expect(drawerRecipeCatalog).toContain("qk-drawer__content--large");
    expect(shortcuts).toContain("100dvh");
    expect(shortcuts).toContain("overflow-y-auto");
  });

  it("publishes enter, exit, and reduced-motion animation contracts", async () => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()],
      theme: quireKitUnoTheme,
      shortcuts: drawerShortcuts
    });
    const result = await generator.generate(drawerRecipeCatalog.join(" "));

    expect(result.css).toContain(".qk-drawer__content");
    expect(result.css).toMatch(/\.qk-drawer__positioner\{[^}]*overflow:clip/u);
    expect(drawerStaticCss).toContain("qk-drawer-left-enter");
    expect(drawerStaticCss).toContain("qk-drawer-right-exit");
    expect(drawerStaticCss).toContain("data-swipe-direction=left");
    expect(drawerStaticCss).toContain("prefers-reduced-motion:reduce");
    expect(drawerStaticCss).toContain("--qk-motion-overlay-duration");
  });

  it("emits bottom geometry, safe insets, and real 44px-token hit areas without losing side widths", async () => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()], theme: quireKitUnoTheme,
      shortcuts: drawerShortcuts, safelist: [...drawerRecipeCatalog]
    });
    const { css, matched } = await generator.generate("");
    for (const name of drawerRecipeCatalog) expect(matched.has(name)).toBe(true);
    expect(css).toMatch(/\.qk-drawer__content--bottom\{[^}]*--qk-drawer-height:auto/u);
    expect(css).toContain("--qk-drawer-max-width:100%");
    expect(css).toContain("--qk-drawer-width:420px");
    expect(css).toContain("width:var(--qk-drawer-responsive-width,var(--qk-drawer-width))");
    expect(drawerStaticCss).toContain("@media(max-width:40rem)");
    expect(css).toContain("env(safe-area-inset-top,0px)");
    expect(css).toContain("env(safe-area-inset-bottom,0px)");
    expect(css).toMatch(/\.qk-drawer__grabber\{[^}]*height:var\(--qk-control-touch-target\)/u);
    expect(css).toMatch(/\.qk-drawer__close-trigger--touch\{[^}]*--qk-drawer-close-size:var\(--qk-control-touch-target\)/u);
    expect(css).not.toContain("touch-action:none");
    expect(drawerStaticCss).toContain("qk-drawer-bottom-enter");
    expect(drawerStaticCss).toContain("--drawer-snap-point-offset-y");
    expect(drawerStaticCss).toContain("height:var(--drawer-height,auto);padding-bottom:var(--drawer-snap-point-offset-y,0px)");
    expect(drawerStaticCss).toContain("transition-duration:0s");
  });
});
