import { defaultTheme } from "@quirekit/ui";
// @vitest-environment happy-dom

import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { ClassicEditorKit } from "../../../extensions";
import { createClassicEditor } from "../../../runtime";
import type { ClassicEditorRenderContext } from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import { createClassicEditorUiApp } from "../../vue-app";
import ClassicEditorShell from "../classic-editor-shell.vue";


const mountedApps: ReturnType<typeof createClassicEditorUiApp>[] = [];
const destroyResources: (() => void)[] = [];

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  for (const destroy of destroyResources.splice(0)) destroy();
  document.body.replaceChildren();
});

describe("Classic shell topbar mounts", () => {
  it("composes identity and switches into the two-row shell", async () => {
    const host = document.createElement("div");
    document.body.append(host);
    const model = createModel();
    const app = createClassicEditorUiApp(
      ClassicEditorShell,
      { model },
      () => model.theme
    );
    mountedApps.push(app);
    app.mount(host);
    await nextTick();

    const title = host.querySelector('[data-qk-shell-row="identity"]');
    const tasks = host.querySelector('[data-qk-shell-row="tasks"]');
    const status = host.querySelector('[role="status"]');
    expect(title).not.toBeNull();
    expect(tasks).not.toBeNull();
    expect(status?.getAttribute("aria-label")).toBe("文档状态");
    expect(tasks?.querySelector(".qk-classic-editor__task-left")?.contains(title!)).toBe(true);
    expect(host.querySelector(".qk-classic-editor__header")?.children).toHaveLength(2);
    expect(title?.querySelector("[role=tablist]")).toBeNull();
    expect(title?.querySelector(".qk-classic-editor__product-switches")).toBeNull();
    expect(host.querySelector('[data-qk-developer-workspace="true"]')).toBeNull();
    expect(title?.textContent).toContain("QuireKit");
    expect(title?.textContent).toContain("未命名文档");
    expect(title?.querySelector(".qk-editable__preview")?.textContent)
      .toBe("未命名文档");
    expect(title?.querySelector<HTMLInputElement>(".qk-editable__input")
      ?.getAttribute("aria-label")).toBe("文档名称");
  });

  it.each(["user", "developer"] as const)("shows right-slot switches in %s mode", async (mode) => {
    const host = document.createElement("div");
    document.body.append(host);
    const model = createModel(mode);
    const app = createClassicEditorUiApp(ClassicEditorShell, { model }, () => model.theme);
    mountedApps.push(app);
    app.mount(host);
    await nextTick();
    const right = host.querySelector(".qk-classic-editor__task-right");
    expect(right?.querySelector('[aria-label^="渲染方式"]')).not.toBeNull();
    expect(right?.querySelector('[aria-label^="界面语言"]')).not.toBeNull();
    expect(host.querySelector('[data-qk-developer-workspace]')).toBeNull();
  });
});

/**
 * Creates the private reactive-model shape consumed by shell components.
 *
 * @param surfaceMode - Optional mounted registration audience.
 * @returns Minimal shell model fixture.
 */
function createModel(surfaceMode?: "user" | "developer"): ClassicEditorShellModel {
  const context = surfaceMode === undefined ? undefined : createContext(surfaceMode);
  return {
    locale: "zh-CN",
    backend: "canvas",
    theme: defaultTheme,
    options: {
      menuBar: true,
      ribbon: true,
      toolbar: true,
      ribbonOverflow: "scroll",
      ruler: false,
      leftSidebar: false,
      rightSidebar: false,
      statusBar: true,
      activeRibbonTab: "home",
      commandBar: {}
    },
    context
  };
}

/**
 * Creates complete typed runtime authorities for a developer rail fixture.
 *
 * @param surfaceMode - Explicit product surface mode.
 * @returns Complete mounted render-context shape.
 */
function createContext(
  surfaceMode: "user" | "developer"
): ClassicEditorRenderContext {
  const instance = createClassicEditor({ surfaceMode });
  const editor = createEditor({ extensions: [ClassicEditorKit] });
  const root = document.createElement("section");
  destroyResources.push(() => {
    editor.destroy();
    instance.destroy();
  });
  return {
    instance,
    editor,
    root,
    ownerDocument: document,
    features: instance.features,
    locale: instance.locale,
    backend: instance.backend,
    ui: instance.ui
  };
}
