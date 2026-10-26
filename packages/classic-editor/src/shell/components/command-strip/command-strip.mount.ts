import { defaultTheme } from "@quirekit/ui";
// @vitest-environment happy-dom

import { nextTick } from "vue";
import { afterEach, describe, expect, it } from "vitest";
import { createEditor } from "@quirekit/core";
import { ClassicEditorKit } from "../../../extensions";
import { createClassicEditor } from "../../../runtime";
import type {
  ClassicEditorActionDefinition,
  ClassicEditorPlugin,
  ClassicEditorRenderContext
} from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import { createClassicEditorUiApp } from "../../vue-app";
import ClassicEditorShell from "../classic-editor-shell.vue";
import { readClassicEditorCommandContentBoxWidth } from "./use-width-budget";

const mountedApps: ReturnType<typeof createClassicEditorUiApp>[] = [];
const destroyResources: (() => void)[] = [];

const directAction: ClassicEditorActionDefinition = {
  id: "test.direct",
  label: { "zh-CN": "直接命令", en: "Direct command" },
  icon: "bold",
  order: 102,
  canExecute: () => true,
  run: () => true
};

const fixturePlugin: ClassicEditorPlugin = {
  id: "test.command-strip",
  contributions: [{
    kind: "ribbon-group",
    id: "test-home",
    tabId: "home",
    label: { "zh-CN": "测试", en: "Test" },
    order: 100
  }, {
    kind: "ribbon-action-control",
    id: "test.direct.ribbon",
    groupId: "test-home",
    label: directAction.label,
    icon: directAction.icon,
    order: directAction.order,
    action: directAction
  }, {
    kind: "ribbon-tab",
    id: "control-tools",
    label: { "zh-CN": "控件工具", en: "Control Tools" },
    contextualFor: ["control"],
    order: 700
  }, {
    kind: "ribbon-group",
    id: "test-control",
    tabId: "control-tools",
    label: { "zh-CN": "控件", en: "Control" },
    order: 701
  }, {
    kind: "ribbon-action-control",
    id: "test.control.ribbon",
    groupId: "test-control",
    label: directAction.label,
    icon: directAction.icon,
    order: 702,
    action: directAction
  }, {
    kind: "ribbon-widget",
    id: "test.compatibility.widget",
    groupId: "test-home",
    order: 103,
    mount: (context) => {
      const element = context.ownerDocument.createElement("span");
      element.dataset.compatibilityWidget = "true";
      return {
        element,
        update: () => undefined,
        destroy: () => undefined
      };
    }
  }],
  toolbarItems: [{
    kind: "toolbar-action-control",
    id: "test.quick.direct",
    label: directAction.label,
    icon: directAction.icon,
    order: directAction.order,
    action: directAction
  }]
};

afterEach(() => {
  for (const app of mountedApps.splice(0)) app.unmount();
  for (const destroy of destroyResources.splice(0)) destroy();
  document.body.replaceChildren();
});

describe("Classic Command Strip cutover mount", () => {
  it("budgets the content box rather than padded client width", () => {
    const element = document.createElement("section");
    element.style.paddingInlineStart = "12px";
    element.style.paddingInlineEnd = "20px";
    Object.defineProperty(element, "clientWidth", { configurable: true, value: 200 });
    document.body.append(element);

    expect(readClassicEditorCommandContentBoxWidth(element)).toBe(168);
  });

  it("retains the real toolbar and compatibility widget by default", async () => {
    const { host } = await mountShell(false);

    expect(host.querySelector('[data-command-renderer="legacy"]')).not.toBeNull();
    expect(host.querySelector('[role="toolbar"].qk-classic-editor__quick-actions'))
      .not.toBeNull();
    expect(host.querySelector('[data-action="test.quick.direct"]')).not.toBeNull();
    expect(host.querySelector('[data-compatibility-widget="true"]')).not.toBeNull();
  });

  it("mounts only direct actions in the explicit typed preview", async () => {
    const { host } = await mountShell(true);

    expect(host.querySelector('[data-command-renderer="typed-preview"]')).not.toBeNull();
    expect(host.querySelector('[data-action-id="test.direct"]')).not.toBeNull();
    expect(host.querySelector('[data-compatibility-widget="true"]')).toBeNull();
    expect(host.querySelector(".qk-classic-editor__ribbon-widget")).toBeNull();
    expect(host.querySelector('[data-action="test.quick.direct"]')).not.toBeNull();
  });

  it("returns contextual task focus to Home after keyboard activation", async () => {
    const { context, host } = await mountShell(true);
    const previous = context.ui.state.semantic;
    context.ui.setSemanticSnapshot({
      ...previous,
      values: {
        ...previous.values,
        "classic.statusTarget": { kind: "control", label: "复选框" }
      },
      freshness: previous.freshness + 1
    });
    await nextTick();
    await nextTick();
    const contextual = host.querySelector<HTMLButtonElement>(
      '[role="tab"][data-value="control-tools"]'
    );
    const home = host.querySelector<HTMLButtonElement>('[role="tab"][data-value="home"]');
    contextual?.focus();
    contextual?.dispatchEvent(new KeyboardEvent("keydown", {
      key: "Home",
      bubbles: true
    }));
    // The public Tabs primitive commits keyboard focus on its animation frame.
    await new Promise<void>(resolve => requestAnimationFrame(() => resolve()));
    await nextTick();
    await nextTick();

    expect(home?.getAttribute("aria-selected")).toBe("true");
    expect(document.activeElement).toBe(home);
  });
});

/**
 * Mounts the private shell against a complete typed context fixture.
 *
 * @param preview - Whether to opt into the typed Command Strip preview.
 * @returns Host and complete mounted context.
 */
async function mountShell(preview: boolean): Promise<{
  readonly host: HTMLElement;
  readonly context: ClassicEditorRenderContext;
}> {
  const host = document.createElement("div");
  document.body.append(host);
  const context = createContext();
  const model: ClassicEditorShellModel = {
    context,
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
      commandBar: { preview }
    }
  };
  const app = createClassicEditorUiApp(
    ClassicEditorShell,
    { model },
    () => model.theme
  );
  mountedApps.push(app);
  app.mount(host);
  await nextTick();
  return { host, context };
}

/**
 * Creates mounted editor, product registry, and UI-controller authorities.
 *
 * @returns Complete render context consumed by the private shell.
 */
function createContext(): ClassicEditorRenderContext {
  const instance = createClassicEditor({ plugins: [fixturePlugin] });
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
