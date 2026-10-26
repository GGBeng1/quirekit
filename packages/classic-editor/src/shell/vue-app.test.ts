// @vitest-environment happy-dom
import { createTheme, defaultTheme } from "@quirekit/ui";
import { defineComponent, h, nextTick, shallowReactive } from "vue";
import { expect, it } from "vitest";
import type { ClassicEditorLocale } from "../types";
import WorkspaceDialog from "../ui/workspace-dialog/workspace-dialog.vue";
import { createClassicEditorUiApp } from "./vue-app";

it("keeps logical providers layout-neutral across selection and theme updates", async () => {
  const state = shallowReactive({
    context: { selection: 0, theme: defaultTheme, locale: "zh-CN" as ClassicEditorLocale }
  });
  const component = defineComponent({
    props: { state: { type: Object, required: true } },
    setup: props => () => h("section", [
      h("span", { "data-selection": "" }, String(props.state.context.selection)),
      h("span", { "data-locale": "" }, props.state.context.locale)
    ])
  });
  const app = createClassicEditorUiApp(
    component,
    { state },
    () => state.context.theme
  );
  const host = document.createElement("div");
  document.body.append(host);
  app.mount(host);
  const componentRoot = host.querySelector<HTMLElement>("section")!;
  expect(host.querySelector("[data-qk-theme-surface]")).toBeNull();
  expect(host.firstElementChild).toBe(componentRoot);
  expect(host.querySelector(".n-config-provider")).toBeNull();

  try {
    expect(host.querySelector("[data-locale]")?.textContent).toBe("zh-CN");
    state.context = { ...state.context, selection: 1 };
    await nextTick();
    expect(host.querySelector("[data-selection]")?.textContent).toBe("1");
    expect(host.firstElementChild).toBe(componentRoot);

    const custom = createTheme({ scheme: "dark", sources: { primary: "#246b55" } });
    state.context = { ...state.context, theme: custom, locale: "en" };
    await nextTick();
    expect(host.querySelector("[data-locale]")?.textContent).toBe("en");
    expect(host.querySelector("[data-qk-theme-surface]")).toBeNull();
  } finally {
    app.unmount();
    host.remove();
  }
});

it("isolates independent application themes and retains explicit workspace overrides", async () => {
  const firstTheme = createTheme({ sources: { primary: "#246b55" } });
  const secondTheme = createTheme({ scheme: "dark", sources: { primary: "#8246ab" } });
  const state = shallowReactive({ theme: firstTheme });
  const firstHost = document.createElement("div");
  const secondHost = document.createElement("div");
  const dialogRoot = document.createElement("div");
  document.body.append(firstHost, secondHost, dialogRoot);
  const explicitColor = "rgb(12, 34, 56)";
  const component = defineComponent({
    setup: () => () => h(WorkspaceDialog, {
      show: true,
      title: "Theme workspace",
      themeRoot: dialogRoot,
      autoFocus: false,
      surfaceClass: "theme-workspace-fixture",
      themeVariables: { "--qk-color-selection-document": explicitColor }
    }, { default: () => h("span", "Workspace content") })
  });
  const firstApp = createClassicEditorUiApp(
    component,
    {},
    () => state.theme,
    { themeSurface: true }
  );
  const secondApp = createClassicEditorUiApp(
    defineComponent({ render: () => h("span", "Other editor") }),
    {},
    () => secondTheme,
    { themeSurface: true }
  );
  firstApp.mount(firstHost);
  secondApp.mount(secondHost);
  try {
    await nextTick();
    const dialog = document.querySelector<HTMLElement>(".theme-workspace-fixture")!;
    const portalTheme = dialog.closest<HTMLElement>("[data-qk-theme-surface]")!;
    const otherTheme = secondHost.querySelector<HTMLElement>("[data-qk-theme-surface]")!;
    expect(otherTheme, secondHost.innerHTML).not.toBeNull();
    expect(portalTheme.style.getPropertyValue("--qk-color-selection-document")).toBe(firstTheme.color.selection.document);
    expect(dialog.style.getPropertyValue("--qk-color-selection-document")).toBe(explicitColor);
    expect(otherTheme.style.getPropertyValue("--qk-color-selection-document")).toBe(secondTheme.color.selection.document);
    state.theme = createTheme({ sources: { primary: "#bd551b" } });
    await nextTick();
    expect(portalTheme.style.getPropertyValue("--qk-color-selection-document")).toBe(state.theme.color.selection.document);
    expect(dialog.style.getPropertyValue("--qk-color-selection-document")).toBe(explicitColor);
    expect(otherTheme.style.getPropertyValue("--qk-color-selection-document")).toBe(secondTheme.color.selection.document);
  } finally {
    firstApp.unmount();
    secondApp.unmount();
    firstHost.remove();
    secondHost.remove();
    dialogRoot.remove();
  }
});
