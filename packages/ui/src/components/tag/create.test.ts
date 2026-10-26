import { expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createTagTokens, createTagCssVariables } from "./index";
it.each(["light", "dark"] as const)("keeps neutral solid tags independent of primary text in %s", scheme => {
  const theme = createTheme({ scheme });
  const recolored = {
    ...theme,
    color: { ...theme.color, text: { ...theme.color.text, primary: scheme === "light" ? "#000000" : "#ffffff" } }
  };
  expect(createTagTokens(recolored)).toEqual(createTagTokens(theme));
});

it.each(["light", "dark"] as const)("reuses current semantic pairs in %s without leaking button interaction tokens", scheme => {
  const theme = createTheme({ scheme });
  const css = createTagCssVariables(createTagTokens(theme));
  expect(Object.keys(css).every(name => name.startsWith("--qk-tag-"))).toBe(true);
  expect(Object.keys(css).some(name => /button|hover|pressed/.test(name))).toBe(false);
  expect(css["--qk-tag-warning-text"]).toBe(theme.color.warning.text);
  expect(css["--qk-tag-warning-on-solid"]).toBe(theme.color.warning.onSolid);
  expect(css["--qk-tag-primary-text"]).toBe(theme.color.action.text);
  expect(css["--qk-tag-neutral-solid"]).toBe(theme.color.surface.inverse);
});
