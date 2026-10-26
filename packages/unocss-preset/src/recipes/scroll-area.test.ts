import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("ScrollArea recipe", () => {
  it("keeps no-overflow visibility in the same cascade layer as the flex layout", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });
    const recipes = result.getLayer("qk-recipes")!;
    const rules = [...recipes.matchAll(/([^{}]+)\{([^{}]+)\}/gu)];
    for (const [orientation, axis] of [["horizontal", "x"], ["vertical", "y"]]) {
      const hidden = rules.find(([, selector, declarations]) =>
        selector!.includes(".qk-scroll-area__scrollbar") &&
        selector!.includes(`data-orientation=${orientation}`) &&
        selector!.includes(`:not([data-overflow-${axis}])`) &&
        declarations!.includes("display:none")
      );
      expect(hidden, `Non-overflowing ${orientation} scrollbars stay hidden`).toBeDefined();
    }
  });

  it("publishes the complete custom scrollbar anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-scroll-area__viewport");
    expect(result.css).toContain("scrollbar-width:none");
    expect(result.css).toContain(".qk-scroll-area__scrollbar--vertical");
    expect(result.css).toContain(".qk-scroll-area__scrollbar--horizontal");
    expect(result.css).toContain(".qk-scroll-area__thumb");
    expect(result.css).toContain("min-height:20px");
  });

  it("insets thumb paint without reducing the existing scrollbar geometry", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig({ defaultTokens: false }));
    const { css } = await generator.generate(
      "qk-scroll-area__scrollbar qk-scroll-area__scrollbar--sm qk-scroll-area__scrollbar--md qk-scroll-area__thumb",
      { safelist: false, preflights: true }
    );
    const rules = [...css.matchAll(/([^{}]+)\{([^{}]+)\}/gu)];
    const thumb = rules.find(([, selector]) => selector!.trim() === ".qk-scroll-area__thumb")?.[2];
    expect(thumb).toContain("box-sizing:border-box");
    expect(thumb).toContain("background-clip:padding-box");
    expect(thumb).toMatch(/border(?:-width)?:1px(?: solid transparent)?[;}]/u);
    expect(thumb).toMatch(/(?:border:1px solid transparent|border-color:transparent)/u);
    expect(thumb).toContain("background-color:var(--qk-color-border-subtle)");
    for (const state of [":hover", "[data-dragging]"]) {
      const active = rules.find(([, selector]) => selector!.includes(`.qk-scroll-area__thumb${state}`));
      expect(active?.[2]).toContain("background-color:var(--qk-color-border-default)");
    }
    for (const [size, width] of [["sm", /width:(?:8px|0?\.5rem);/u], ["md", /width:(?:10px|0?\.625rem);/u]] as const) {
      const vertical = rules.find(([, selector]) => selector!.includes(`.qk-scroll-area__scrollbar--${size}[data-orientation=vertical]`));
      expect(vertical?.[2]).toMatch(width);
    }
    expect(css).toContain("min-height:20px;width:100%");
    expect(css).toContain("height:100%;min-width:20px");
  });

  it("keeps auto-hidden scrollbars interactive while active", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(
      ".qk-scroll-area--auto .qk-scroll-area__scrollbar{opacity:0;pointer-events:none}"
    );
    expect(result.css).toContain(
      ".qk-scroll-area--auto .qk-scroll-area__scrollbar[data-hover]"
    );
    expect(result.css).toContain("opacity:1;pointer-events:auto");

    const baseScrollbarRule = result.css.match(
      /\.qk-scroll-area__scrollbar\{([^}]*)\}/
    )?.[1];
    expect(baseScrollbarRule).toBeDefined();
    expect(baseScrollbarRule).not.toContain("opacity:1");
  });
});
