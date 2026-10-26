import { shallowReactive } from "vue";
import { createClassicEditorUiApp } from "../../../shell/vue-app";
import { readClassicEditorAppearance } from "../../../shell/appearance";
import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext
} from "../../../types";
import ClassicEditorOutlinePanel from "./outline-panel.vue";
import type { ClassicEditorOutlinePanelState } from "./types";

/**
 * Mounts the built-in document outline with the public TreeView.
 *
 * @param context - Mounted product context.
 * @returns Retained Vue surface with explicit update and teardown.
 */
export function renderBuiltinOutline(
  context: ClassicEditorRenderContext
): ClassicEditorMountedRenderable {
  const host = context.ownerDocument.createElement("div");
  const state = shallowReactive<ClassicEditorOutlinePanelState>({ context });
  const app = createClassicEditorUiApp(
    ClassicEditorOutlinePanel,
    { state },
    readClassicEditorAppearance(state.context.root)
  );
  host.className = "qk-classic-editor__outline-host";
  app.mount(host);
  return {
    element: host,
    update(nextContext) {
      state.context = nextContext;
    },
    destroy() {
      app.unmount();
    }
  };
}
