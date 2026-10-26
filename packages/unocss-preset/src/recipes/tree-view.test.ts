import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { defineQuireKitUnoConfig } from "../preset/config";

describe("TreeView recipe", () => {
  it("publishes branch, item and dynamic indentation anatomy", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain(".qk-tree-view__branch-control");
    expect(result.css).toContain(".qk-tree-view__item");
    expect(result.css).toContain("var(--depth)");
    expect(result.css).toContain(".qk-tree-view__indent-guide");
    expect(result.css).toContain(".qk-tree-view--selection-background");
    expect(result.css).toContain(".qk-tree-view--selection-text");
  });

  it("keeps selection, focus, disabled and loading states distinct", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const result = await generator.generate("", { preflights: true });

    expect(result.css).toContain("[data-selected]");
    expect(result.css).toContain(":focus-visible");
    const focusRules = result.css.match(/\.qk-tree-view__(?:branch-control|item):focus-visible\{[^}]+\}/gu) ?? [];
    expect(focusRules).toHaveLength(2);
    expect(focusRules.join("\n")).toContain("text-decoration-line:underline");
    expect(focusRules.join("\n")).not.toMatch(/box-shadow|outline|border-color/);
    expect(result.css).toContain("[data-disabled]");
    expect(result.css).toContain("qk-tree-view-spin");
    expect(result.css).toContain("prefers-reduced-motion:reduce");
  });

  it("keeps ancestor guides non-interactive and lets consumers hide them without changing indentation", async () => {
    const generator = await createGenerator(defineQuireKitUnoConfig());
    const { css } = await generator.generate("", { preflights: true });
    expect(css).toMatch(/\.qk-tree-view\{[^}]*isolation:isolate/);
    expect(css).toMatch(/\.qk-tree-view__indent-guide\{[^}]*pointer-events:none/);
    expect(css).toMatch(/\.qk-tree-view__indent-guide\{[^}]*z-index:1/);
    expect(css).toContain(".qk-tree-view--hide-guides .qk-tree-view__indent-guide{display:none}");
    expect(css).toContain("[data-selected]:not([data-disabled])");
    expect(css).not.toMatch(/\.qk-tree-view[^{}]*\[data-selected\]\{(?:background|color):/);
  });
});
