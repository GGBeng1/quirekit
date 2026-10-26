import { createGenerator } from "@unocss/core";
import { presetWind3 } from "@unocss/preset-wind3";
import type { Theme } from "@unocss/preset-wind3";
import { expect, it } from "vitest";
import { quireKitUnoTheme } from "../../theme/bridge";
import { listboxShortcuts } from "../listbox";
import { popoverShortcuts } from "../popover";
import { choicePickerRecipeCatalog, choicePickerShortcuts } from "./choice-picker";

it.each([false, true])("gives the selection body sole scrolling ownership with either recipe order: %s", async reverse => {
  const base = [...listboxShortcuts, ...popoverShortcuts];
  const generator = await createGenerator<Theme>({
    presets: [presetWind3()], theme: quireKitUnoTheme,
    shortcuts: reverse ? [...choicePickerShortcuts, ...base] : [...base, ...choicePickerShortcuts]
  });
  const { css, matched } = await generator.generate(choicePickerRecipeCatalog.join(" "));
  for (const name of choicePickerRecipeCatalog) expect(matched.has(name)).toBe(true);
  expect(css).toMatch(/\.qk-choice-picker__list\.qk-listbox__content\{[^}]*overflow:visible/u);
  expect(css).toMatch(/\.qk-choice-picker__body\{[^}]*overflow-y:auto/u);
  expect(css).toContain(".qk-choice-picker__surface--desktop.qk-popover__content");
  expect(css).toContain("grid-template-rows:auto minmax(0,1fr) auto");
  expect(css).toContain("--qk-listbox-max-height:none");
  expect(css).toContain("min-height:var(--qk-control-touch-target)");
});
