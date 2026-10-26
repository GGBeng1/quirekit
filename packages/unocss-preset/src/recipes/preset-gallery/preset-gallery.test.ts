import { createGenerator } from "@unocss/core";
import { presetWind3, type Theme } from "@unocss/preset-wind3";
import { describe, expect, it } from "vitest";
import { quireKitUnoTheme } from "../../theme/bridge";
import { listboxRecipeCatalog, listboxShortcuts } from "../listbox/listbox";
import { presetGalleryRecipeCatalog, presetGalleryShortcuts } from "./preset-gallery";

describe("PresetGallery recipe", () => {
  it("emits responsive grid geometry and a stable preview stage using semantic spacing", async () => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()], theme: quireKitUnoTheme,
      shortcuts: presetGalleryShortcuts, safelist: [...presetGalleryRecipeCatalog]
    });
    const { css, matched } = await generator.generate("");
    for (const name of presetGalleryRecipeCatalog) expect(matched.has(name)).toBe(true);
    expect(css).toContain("repeat(var(--qk-preset-gallery-repeat, auto-fit)");
    expect(css).toContain("var(--qk-preset-gallery-min-width)");
    expect(css).toContain("var(--qk-preset-gallery-max-columns)");
    expect(css).toContain("var(--qk-space-inline)");
    expect(css).toContain("aspect-ratio:4/3");
    expect(css).toContain("--qk-preset-gallery-repeat:auto-fill");
    expect(css).toContain("--qk-preset-gallery-item-padding:0px");
    expect(css).toContain("padding:var(--qk-preset-gallery-item-padding, var(--qk-space-inline))");
    expect(css).toMatch(/\.qk-preset-gallery__description[^{]*\{[^}]*overflow-wrap:break-word/u);
    expect(css).not.toContain("box-shadow:");
    expect(css).toContain("--qk-color-border-strong");
    expect(css).not.toContain("[data-highlighted]");
    expect(css).toContain(".qk-preset-gallery__preview[data-selected]");
    expect(css).toContain("var(--qk-preset-gallery-preview-border, var(--qk-color-border-subtle))");
    expect(css).not.toContain(".qk-preset-gallery__indicator");
    expect(css).toContain("background-color:var(--qk-color-surface-selected)");
    expect(css).toContain(".qk-preset-gallery__item[data-focus-visible]");
    expect(css).toContain("background-color:var(--qk-color-surface-hover)");
    expect(css).not.toContain("--qk-preset-gallery-focus-width");
    expect(css).toContain("outline:none");
  });

  it.each([false, true])("keeps the composed grid template authoritative with reversed registration=%s", async (reversed) => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()], theme: quireKitUnoTheme,
      shortcuts: reversed ? [...presetGalleryShortcuts, ...listboxShortcuts] : [...listboxShortcuts, ...presetGalleryShortcuts],
      safelist: [...listboxRecipeCatalog, ...presetGalleryRecipeCatalog]
    });
    const { css } = await generator.generate("");
    const listbox = css.match(/\.qk-listbox__content--grid\{([^}]*)\}/u)?.[1] ?? "";
    const content = css.match(/\.qk-listbox__content\{([^}]*)\}/u)?.[1] ?? "";
    const root = css.match(/\.qk-preset-gallery\{([^}]*)\}/u)?.[1] ?? "";
    const gallery = css.match(/\.qk-preset-gallery__grid\{([^}]*)\}/u)?.[1] ?? "";
    const item = css.match(/\.qk-preset-gallery__item\{([^}]*)\}/u)?.[1] ?? "";
    const baseItem = css.match(/\.qk-listbox__item\{([^}]*)\}/u)?.[1] ?? "";

    expect(listbox).toContain("grid-template-columns:var(--qk-listbox-grid-template,repeat(var(--qk-listbox-columns,1),minmax(0,1fr)))");
    expect(gallery).toContain("--qk-listbox-grid-template:repeat(var(--qk-preset-gallery-repeat, auto-fit)");
    expect(gallery).not.toContain("grid-template-columns:");
    expect(gallery).toContain("grid-auto-rows:min-content");
    expect(gallery).toContain("align-content:flex-start");
    expect(root).toContain("--qk-listbox-max-height:none");
    expect(content).toContain("max-height:var(--qk-listbox-max-height,20rem)");
    expect(gallery).not.toContain("max-height:");
    expect(item).toContain("--qk-listbox-item-display:grid;");
    expect(item).toContain("--qk-listbox-item-hover-background:var(--qk-preset-gallery-hover-background, transparent)");
    expect(item).toContain("--qk-listbox-item-selected-background:var(--qk-preset-gallery-selected-background, transparent)");
    expect(item).toContain("--qk-listbox-item-focus-color:transparent");
    expect(css).toContain(".qk-listbox__item[data-focus-visible]");
    expect(baseItem).toContain("display:var(--qk-listbox-item-display,flex)");
    expect(item).not.toMatch(/(?:^|;)display:/u);
    expect(item).not.toContain("!important");
  });
});
