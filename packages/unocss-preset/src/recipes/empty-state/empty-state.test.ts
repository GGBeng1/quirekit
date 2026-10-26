import { createGenerator } from "@unocss/core";
import { describe, expect, it } from "vitest";
import { presetWind3 } from "@unocss/preset-wind3";
import type { Theme } from "@unocss/preset-wind3";
import { quireKitUnoTheme } from "../../theme/bridge";
import { emptyStateRecipeCatalog, emptyStateShortcuts } from "./empty-state";

describe("EmptyState recipe", () => {
  it("compiles every anatomy part with neutral semantic text and two density sizes", async () => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()],
      theme: quireKitUnoTheme,
      shortcuts: emptyStateShortcuts,
      safelist: [...emptyStateRecipeCatalog]
    });
    const { css, matched } = await generator.generate("");

    for (const name of emptyStateRecipeCatalog) expect(matched.has(name)).toBe(true);
    expect(css).toContain("var(--qk-color-text-secondary)");
    expect(css).toContain("var(--qk-space-group)");
    expect(css).toContain("var(--qk-space-surface)");
    expect(css).toContain("font-weight:var(--qk-type-control-font-weight)");
    expect(css).toContain("var(--qk-color-text-muted)");
    expect(css).not.toContain("var(--qk-type-heading-font-weight)");
    expect(css).toContain("width:calc(var(--qk-space-group) * 6)");
    expect(css).toContain("aspect-ratio:20/13");
    expect(css).not.toContain("animation:");
    expect(css).not.toContain("box-shadow:");
  });

  it("lets long feedback wrap and actions flow inside a narrow parent", async () => {
    const generator = await createGenerator<Theme>({
      presets: [presetWind3()],
      theme: quireKitUnoTheme,
      shortcuts: emptyStateShortcuts,
      safelist: [...emptyStateRecipeCatalog]
    });
    const { css } = await generator.generate("");

    expect(css).toContain("overflow-wrap:break-word");
    expect(css).toContain("flex-wrap:wrap");
    expect(css).toContain("max-width:100%");
    expect(css).toContain("min-width:0");
    expect(css).not.toContain("text-overflow:ellipsis");
    expect(css).not.toContain("overflow:hidden");
  });
});
