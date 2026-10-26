import { createGenerator } from "@unocss/core";
import type { Theme } from "@unocss/preset-wind3";
import { presetWind3 } from "@unocss/preset-wind3";
import { expect, it } from "vitest";
import { checkboxGroupShortcuts, checkboxGroupRecipeCatalog } from "./index";
import { toggleGroupShortcuts, toggleGroupRecipeCatalog } from "../toggle-group";
import { quireKitUnoTheme } from "../../theme/bridge";

it("generates group spacing while leaving the reused controls' geometry intact", async () => {
  const catalog = [...checkboxGroupRecipeCatalog, ...toggleGroupRecipeCatalog];
  const generator = await createGenerator<Theme>({ presets: [presetWind3()], theme: quireKitUnoTheme, shortcuts: [...checkboxGroupShortcuts, ...toggleGroupShortcuts] });
  const { css, matched } = await generator.generate(catalog.join(" "));
  for (const name of catalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain("var(--qk-checkbox-group-gap)");
  expect(css).toContain("var(--qk-toggle-group-gap)");
  expect(css).toContain("flex-wrap:wrap");
  expect(css).not.toMatch(/(?:^|[;{])height:/);
});
