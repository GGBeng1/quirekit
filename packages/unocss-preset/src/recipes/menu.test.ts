import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";
import { collectQuireCssRulesByPrelude } from "../../test-support/css-rules";

describe("Menu context entry recipe", () => {
  it("gives selection checks the shared accent without a competing inherited color", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    const rules = collectQuireCssRulesByPrelude(css, [".qk-menu__selection-indicator"]);
    expect(rules).toContain("color:var(--qk-color-action-text)");
    expect(rules).toContain("[data-disabled=true]");
    expect(collectQuireCssRulesByPrelude(css, [".qk-menu__indicator"]))
      .not.toMatch(/\.qk-menu__indicator[^{]*\{[^}]*color:currentColor/);
  });

  it("publishes keyboard focus and a scrollable context surface without changing ordinary menus", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("");
    const rules = collectQuireCssRulesByPrelude(
      css,
      ["qk-menu__context-trigger", "qk-menu--context"]
    );
    expect(rules).toContain(".qk-menu__context-trigger:focus-visible");
    expect(rules).not.toContain("inset 0 0 0 1px");
    expect(rules).toContain("background-color:var(--qk-color-surface-hover)");
    expect(rules).toMatch(/\.qk-menu--context[^{]*\{[^}]*overflow-y:auto/);
    expect(rules).toContain("transition:none");
    expect(css).toMatch(/\.qk-menu--viewport[^{]*\{[^}]*overflow-y:auto/);
    expect(css).toMatch(/\.qk-menu__positioner--modal[^{]*\{[^}]*--qk-menu-layer:calc\(var\(--qk-layer-modal\) \+ 1\)/);
    expect(css).toContain("--z-index:calc(var(--qk-menu-layer) + var(--qk-menu-depth, 0)) !important");
    // The positioner is the stacking element: a layer set only on the static surface has no effect.
    for (const positioner of [".qk-menu__positioner", ".qk-select__positioner", ".qk-combobox__positioner"]) {
      expect(collectQuireCssRulesByPrelude(css, [positioner])).toContain("z-index:var(--z-index)");
    }
    for (const family of ["select", "combobox"]) {
      expect(css).toContain(`--qk-${family}-layer:calc(var(--qk-layer-modal) + 1)`);
      expect(css).toContain(`--z-index:var(--qk-${family}-layer, var(--qk-layer-overlay)) !important`);
      expect(css).toContain(`z-index:var(--qk-${family}-layer, var(--qk-layer-overlay))`);
    }
  });
});
