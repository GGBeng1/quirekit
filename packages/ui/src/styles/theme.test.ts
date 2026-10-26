// @vitest-environment happy-dom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createApp, defineComponent, h, nextTick, shallowRef } from "vue";
import { createTheme, defaultTheme } from "../theme";
import { createUiThemeCssVariables } from "./theme";

afterEach(() => vi.restoreAllMocks());

describe("shared UI theme CSS projection", () => {
  it("retains one immutable projection for repeated reads of the same theme", () => {
    const theme = createTheme();
    const variables = createUiThemeCssVariables(theme);

    expect(createUiThemeCssVariables(theme)).toBe(variables);
    expect(Object.isFrozen(variables)).toBe(true);
    expect(variables["--qk-color-selection-document"]).toBe(theme.color.selection.document);
  });

  it("isolates replacement themes and reuses a previously selected theme", () => {
    const custom = createTheme({ scheme: "dark", sources: { primary: "#7257d5" } });
    const initial = createUiThemeCssVariables(defaultTheme);
    const replacement = createUiThemeCssVariables(custom);

    expect(replacement).not.toBe(initial);
    expect(replacement["--qk-color-selection-document"]).toBe(custom.color.selection.document);
    expect(initial["--qk-color-selection-document"]).toBe(defaultTheme.color.selection.document);
    expect(createUiThemeCssVariables(defaultTheme)).toBe(initial);
  });

  it("avoids CSS rewrites on unrelated Vue updates while retaining theme changes", async () => {
    const theme = shallowRef(defaultTheme);
    const selection = shallowRef(0);
    const host = document.createElement("div");
    const app = createApp(defineComponent({
      setup: () => () => h("div", {
        style: createUiThemeCssVariables(theme.value)
      }, String(selection.value))
    }));
    app.mount(host);
    const surface = host.firstElementChild as HTMLElement;
    const setProperty = vi.spyOn(surface.style, "setProperty");

    try {
      selection.value += 1;
      await nextTick();
      expect(surface.textContent).toBe("1");
      expect(setProperty).not.toHaveBeenCalled();

      theme.value = createTheme({ scheme: "dark", sources: { primary: "#246b55" } });
      await nextTick();
      expect(setProperty).toHaveBeenCalled();
      expect(surface.style.getPropertyValue("--qk-color-selection-document"))
        .toBe(theme.value.color.selection.document);
    } finally {
      app.unmount();
    }
  });
});
