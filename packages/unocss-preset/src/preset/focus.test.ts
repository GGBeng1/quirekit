import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "./config";
import { createKeyboardFocusCss } from "./focus";

describe("keyboard focus ring", () => {
  it("is emitted after recipes so recipe-level outline resets cannot hide it", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const result = await generator.generate("qk-button", { preflights: true });
    expect(result.layers.indexOf("qk-preferences")).toBeGreaterThan(result.layers.indexOf("qk-recipes"));
    expect(result.getLayer("qk-preferences")).toContain(createKeyboardFocusCss());
  });

  it("applies only outside pointer modality and never to text entry or highlighted composite rows", () => {
    const css = createKeyboardFocusCss();
    const rules = css.split("\n");
    expect(rules).toHaveLength(4);
    for (const rule of rules.slice(0, 2)) {
      const selector = rule.slice(0, rule.indexOf("{"));
      for (const branch of selector.split(/,\s*html/u)) {
        expect(branch).toContain(':not([data-qk-modality="pointer"])');
      }
      expect(selector).toMatch(/:not\(input, textarea, select, \[contenteditable\], \[role="menuitem"\]/u);
      expect(rule).toContain("outline: var(--qk-border-width-focus) solid var(--qk-color-border-focus);");
    }
    for (const rule of rules.slice(2)) {
      expect(rule).toContain('html:not([data-qk-modality="pointer"]) .qk-media-player__thumb:focus-visible');
      expect(rule).not.toContain(":where(");
    }
  });

  it("insets the ring by default and draws it outside filled or small controls", () => {
    const [inset, outset, media, forcedMedia] = createKeyboardFocusCss().split("\n");
    expect(inset).toContain("outline-offset: calc(-1 * var(--qk-border-width-focus))");
    expect(outset).toContain('.qk-button[class*="-solid"]');
    expect(outset).toContain(".qk-switch__control");
    expect(outset).toContain("outline-offset: var(--qk-border-width-focus)");
    expect(css(inset)).not.toMatch(/(?:padding|margin|width|height|border-width|box-shadow):/u);
    expect(media).toContain("outline-color: var(--qk-color-action-primary); outline-offset: 0;");
    expect(forcedMedia).toContain("@media (forced-colors: active)");
    expect(forcedMedia).toContain("outline-color: Highlight;");
  });
});

/**
 * Extracts the declaration block of one rule.
 * @param rule - Single CSS rule.
 * @returns Declarations without the selector.
 */
function css(rule: string | undefined): string {
  return rule?.slice(rule.indexOf("{")) ?? "";
}
