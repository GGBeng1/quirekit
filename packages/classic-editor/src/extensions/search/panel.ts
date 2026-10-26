import { shallowReactive } from "vue";
import type { ClassicEditorMountedRenderable, ClassicEditorRenderContext } from "@classic/types";
import { readClassicEditorAppearance } from "@classic/shell/appearance";
import { createClassicEditorUiApp } from "@classic/shell/vue-app";
import ClassicSearchFloatingPanel from "./floating-panel.vue";
import { getClassicSearchSession } from "./session";
import { installClassicSearchShortcut } from "./shortcut";
import type { ClassicSearchHostState } from "./types";

/**
 * Mounts the floating search card host for one Classic root.
 *
 * The host stays mounted and renders nothing until a trigger opens the panel;
 * it also owns the page-level find shortcut for this root.
 *
 * @param context - Mounted product context.
 * @returns Host lifecycle.
 */
export function mountClassicSearchProvider(
  context: ClassicEditorRenderContext
): ClassicEditorMountedRenderable {
  const element = context.ownerDocument.createElement("div");
  const host = shallowReactive<ClassicSearchHostState>({ context });
  const session = getClassicSearchSession(context.editor);
  const detach = session.attach();
  const removeShortcut = installClassicSearchShortcut(() => host.context, session);
  const app = createClassicEditorUiApp(
    ClassicSearchFloatingPanel,
    { host, session },
    readClassicEditorAppearance(host.context.root)
  );
  app.mount(element);
  return {
    element,
    /** @param next - Latest product context. */
    update(next): void { host.context = next; },
    /** Unmounting the panel also clears search highlights. */
    destroy(): void {
      removeShortcut();
      detach();
      app.unmount();
    }
  };
}
