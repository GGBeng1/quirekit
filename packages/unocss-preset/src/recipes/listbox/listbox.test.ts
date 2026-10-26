import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../../preset/config";
import { listboxRecipeCatalog, listboxShortcuts } from "./listbox";

describe("Listbox recipe", () => {
  it("keeps selected and focus states separate without changing option geometry", async () => {
    const generator = await createGenerator({
      ...defineQuireKitUnoConfig(),
      shortcuts: listboxShortcuts,
      safelist: [...listboxRecipeCatalog]
    });
    const { css } = await generator.generate("");
    expect(css).toContain(".qk-listbox__item[data-selected]");
    expect(css).toContain("background-color:var(--qk-listbox-item-hover-background,var(--qk-color-surface-hover))");
    expect(css).toContain("background-color:var(--qk-listbox-item-selected-background,var(--qk-color-surface-selected))");
    expect(css).toContain(".qk-listbox__item[data-focus-visible]");
    const focus = css.match(/\.qk-listbox__item\[data-focus-visible\]\{([^}]+)\}/u)?.[1];
    expect(focus).toContain("text-decoration-line:underline");
    expect(focus).not.toMatch(/outline|border|box-shadow/);
    expect(css).toContain(".qk-listbox__item[data-disabled]");
    expect(css).toContain(".qk-listbox__content:focus-visible[data-highlight-empty]");
    expect(css).toContain("max-height:var(--qk-listbox-max-height,20rem)");
    expect(css).toContain("grid-template-columns:var(--qk-listbox-grid-template,repeat(var(--qk-listbox-columns,1),minmax(0,1fr)))");
    expect(css).toContain("display:var(--qk-listbox-item-display,flex)");
    expect(css).toContain(".qk-listbox__indicator");
    // Consumers assert this semantic class to hide a label, so the recipe must
    // keep resolving to the visually-hidden utilities the preset publishes.
    expect(css).toMatch(/\.qk-listbox__visually-hidden\{[^}]*position:absolute/u);
  });

  it("shares a narrow native scrollbar with time columns while keeping system fallback", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate("qk-listbox__content qk-time-picker__list", { safelist: false, preflights: true });
    expect(css).toMatch(/\.qk-listbox__content\{[^}]*scrollbar-width:thin/u);
    expect(css).toContain("scrollbar-color:var(--qk-color-border-subtle) transparent");
    expect(css).toMatch(/@supports\s+selector\(::-webkit-scrollbar\)/u);
    expect(css).toMatch(/@media\s*\(forced-colors:\s*none\)/u);
    expect(css).toMatch(/\.qk-listbox__content\{[^}]*scrollbar-width:auto;[^}]*scrollbar-color:auto/u);
    expect(css).toMatch(/\.qk-listbox__content::-webkit-scrollbar\{[^}]*width:8px/u);
    const thumb = css.match(/\.qk-listbox__content::-webkit-scrollbar-thumb\{([^}]+)\}/u)?.[1];
    expect(thumb).toContain("border:2px solid transparent");
    expect(thumb).toContain("background-clip:padding-box");
    expect(thumb).toContain("background-color:var(--qk-color-border-subtle)");
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/gu)];
    for (const state of ["hover", "active"]) {
      const active = rules.find(([, selector]) => selector!.includes(`.qk-listbox__content::-webkit-scrollbar-thumb:${state}`));
      expect(active?.[2]).toContain("background-color:var(--qk-color-border-default)");
    }
    const timeRules = [...css.matchAll(/\.qk-time-picker__list(?:\[[^\]]+\])?\{([^}]+)\}/gu)];
    expect(timeRules.length).toBeGreaterThan(0);
    expect(timeRules.every(([, declarations]) => !declarations!.includes("scrollbar-"))).toBe(true);
    expect(css).toContain("overflow-y:auto");
  });
});
