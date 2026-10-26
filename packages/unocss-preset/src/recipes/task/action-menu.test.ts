import { createGenerator } from "@unocss/core";
import { presetWind3 } from "@unocss/preset-wind3";
import type { Theme } from "@unocss/preset-wind3";
import { expect, it } from "vitest";
import { quireKitUnoTheme } from "../../theme/bridge";
import { menuShortcuts } from "../menu";
import { actionMenuRecipeCatalog, actionMenuShortcuts } from "./action-menu";

it.each([false, true])("keeps task row geometry independent from recipe order: %s", async reverse => {
  const generator = await createGenerator<Theme>({
    presets: [presetWind3()], theme: quireKitUnoTheme,
    shortcuts: reverse ? [...actionMenuShortcuts, ...menuShortcuts] : [...menuShortcuts, ...actionMenuShortcuts]
  });
  const { css, matched } = await generator.generate(actionMenuRecipeCatalog.join(" "));
  for (const name of actionMenuRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toContain(".qk-action-menu__item.qk-menu__item");
  expect(css).toContain("height:auto");
  expect(css).toContain("var(--qk-control-touch-target)");
  expect(css).toContain("white-space:normal");
  expect(css).not.toContain("!important");
});
