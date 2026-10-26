import { defaultTheme } from "@quirekit/ui";
import { createApp, defineComponent, h, nextTick, ref, shallowReactive } from "vue";
import { vi } from "vitest";
import type { ClassicEditorRenderContext, ClassicEditorRibbonItemContribution } from "../../../types";
import type { ClassicEditorShellModel } from "../../types";
import type { ResolvedClassicEditorCommandBarGroup } from "../command-bar";
import { useClassicEditorOverlay } from "../../overlays/registry";
import Ribbon from "../../components/classic-editor-ribbon.vue";

/**
 * Mounts the default shell's real public Toolbar with controlled product context.
 * @param items - Registry items in their configured order.
 * @param presentation - Inline group or action-only menu request.
 * @returns Mounted nodes, live model, command spy and deterministic cleanup.
 */
export async function mountClassicToolbar(items: readonly ClassicEditorRibbonItemContribution[], presentation: "inline" | "menu" = "inline") {
  const host = document.createElement("div");
  host.className = "qk-classic-editor";
  const executeContribution = vi.fn(() => Promise.resolve(true));
  const canExecuteContribution = vi.fn<ClassicEditorRenderContext["instance"]["canExecuteContribution"]>(() => true);
  const context = {
    root: host, ownerDocument: document, locale: "en",
    instance: { canExecuteContribution, executeContribution }
  } as unknown as ClassicEditorRenderContext;
  const model = shallowReactive({ context, locale: "en", theme: defaultTheme, backend: "canvas", options: { ribbon: true } } as ClassicEditorShellModel);
  const groups = shallowReactive<{ value: readonly ResolvedClassicEditorCommandBarGroup[] }>({ value: [{ id: "format", tabId: "home", label: "Format", presentation, items }] });
  const activeTab = ref("home");
  let sibling: ReturnType<typeof useClassicEditorOverlay>;
  const app = createApp(defineComponent({ setup() {
    sibling = useClassicEditorOverlay("test-sibling", undefined, document, host);
    return () => h(Ribbon, { model, activeTab: activeTab.value, commandPanelId: "toolbar-test",
      ribbonTabs: [...new Set(groups.value.map(group => group.tabId))].map(id => ({ kind: "ribbon-tab" as const, id, label: id })), commandBarGroups: groups.value });
  } }));
  document.body.append(host);
  app.mount(host);
  await nextTick();
  await nextTick();
  return { host, model, groups, activeTab, canExecuteContribution, executeContribution, sibling: sibling!, dispose: () => { app.unmount(); host.remove(); } };
}
