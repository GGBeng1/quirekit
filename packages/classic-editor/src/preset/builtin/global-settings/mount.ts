import { shallowReactive } from "vue";
import { selectVisibleClassicEditorContributions } from "../../../shell/contribution/visibility";
import { readClassicEditorAppearance } from "../../../shell/appearance";
import { createClassicEditorUiApp } from "../../../shell/vue-app";
import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext
} from "../../../types";
import ClassicEditorGlobalSettingsPanel from "./panel.vue";
import type { ClassicEditorGlobalSettingsPanelState } from "./types";

/**
 * Mounts the extensible product-level global-settings inspector.
 *
 * @param context - Mounted product context.
 * @returns Retained Vue surface with explicit update and teardown.
 */
export function renderBuiltinGlobalSettings(
  context: ClassicEditorRenderContext
): ClassicEditorMountedRenderable {
  const host = context.ownerDocument.createElement("div");
  const state = shallowReactive<ClassicEditorGlobalSettingsPanelState>({
    context,
    sections: resolveSections(context)
  });
  const app = createClassicEditorUiApp(
    ClassicEditorGlobalSettingsPanel,
    { state },
    readClassicEditorAppearance(state.context.root)
  );
  host.className = "qk-classic-editor__global-settings-host";
  app.mount(host);
  return {
    element: host,
    update(nextContext) {
      state.context = nextContext;
      state.sections = resolveSections(nextContext);
    },
    destroy() {
      app.unmount();
    }
  };
}

/**
 * Selects visible settings sections without evaluating unrelated surfaces.
 *
 * @param context - Current presentation context.
 * @returns Visible global-settings sections in contribution order.
 */
function resolveSections(context: ClassicEditorRenderContext) {
  return selectVisibleClassicEditorContributions(
    context.instance.registry.contributions,
    context,
    "global-settings-section"
  );
}
