// @vitest-environment happy-dom
import { createTheme, createUiThemeCssVariables, defaultTheme } from "@quirekit/ui";
import { computed } from "vue";
import { describe, expect, it } from "vitest";
import { applyClassicEditorTheme, readClassicEditorTheme, readClassicEditorThemeVariables } from "./theme";

describe("shared QuireKit theme ownership", () => {
  it("projects the same complete theme and isolates independently mounted roots", () => {
    const first = document.createElement("div");
    const second = document.createElement("div");
    const custom = createTheme({ scheme: "dark", sources: { primary: "#7257d5" } });
    const projection = computed(() => readClassicEditorThemeVariables(first));
    expect(readClassicEditorTheme(first)).toBe(defaultTheme);
    expect(projection.value).toEqual(createUiThemeCssVariables(defaultTheme));
    applyClassicEditorTheme(first, custom);
    applyClassicEditorTheme(second, defaultTheme);
    expect(readClassicEditorTheme(first)).toBe(custom);
    expect(readClassicEditorTheme(second)).toBe(defaultTheme);
    expect(projection.value).toEqual(createUiThemeCssVariables(custom));
    expect(first.style.getPropertyValue("--qk-color-selection-document"))
      .toBe(custom.color.selection.document);
    expect(first.style.colorScheme).toBe("dark");
    expect(first.style.cssText).not.toContain("--qk-classic-");
    applyClassicEditorTheme(first, defaultTheme);
    expect(projection.value).toEqual(createUiThemeCssVariables(defaultTheme));
    expect(first.style.colorScheme).toBe("light");
  });

});
