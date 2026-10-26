import { describe, expect, it } from "vitest";
import { createTheme } from "../../theme";
import { createTableTokens, createTableCssVariables } from "./index";

describe("Table tokens", () => {
  it.each(["light", "dark"] as const)("projects semantic roles in %s mode", scheme => {
    const theme = createTheme({ scheme });
    const values = createTableCssVariables(createTableTokens(theme));
    expect(values["--qk-table-padding"]).toBe(theme.spacing.surfaceCompact);
    expect(values["--qk-table-current-background"]).toBe(theme.color.surface.selected);
    expect(values["--qk-table-header-background"]).toBe(theme.color.surface.page);
    expect(values["--qk-table-foreground"]).toBe(theme.color.text.primary);
  });
});
