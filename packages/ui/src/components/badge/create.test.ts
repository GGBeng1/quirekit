import { expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createBadgeTokens, createBadgeCssVariables } from "./index";
it.each(["light", "dark"] as const)("keeps neutral solid badges independent of primary text in %s", scheme => {
  const theme = createTheme({ scheme });
  const recolored = {
    ...theme,
    color: { ...theme.color, text: { ...theme.color.text, primary: scheme === "light" ? "#000000" : "#ffffff" } }
  };
  expect(createBadgeTokens(recolored)).toEqual(createBadgeTokens(theme));
});

it.each(["light", "dark"] as const)("reuses current semantic pairs in %s without leaking button interaction tokens", scheme => {
  const theme = createTheme({ scheme });
  const css = createBadgeCssVariables(createBadgeTokens(theme));
  expect(Object.keys(css)).toHaveLength(40);
  expect(css["--qk-badge-warning-text"]).toBe(theme.color.warning.text);
  expect(css["--qk-badge-warning-on-solid"]).toBe(theme.color.warning.onSolid);
  expect(css["--qk-badge-primary-text"]).toBe(theme.color.action.text);
  expect(css["--qk-badge-neutral-solid"]).toBe(theme.color.surface.inverse);
});
