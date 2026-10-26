import type {
  ClassicEditorWorkspacePanelContribution,
  ClassicEditorWorkspacePanelMountContext
} from "../../../types/workspace-panel";
import type { ClassicEditorObjectWorkspaceController } from "../../../types/object-workspace";
import { readClassicEditorAppearance } from "../../appearance";
import { createClassicEditorUiApp } from "../../vue-app";
import ClassicEditorObjectInspectorSurface from "../../components/object-workspace/inspector-surface.vue";

/**
 * Creates the one direct Workspace Panel contribution for an object controller.
 *
 * @param controller - Shared exact-target object workspace controller.
 * @returns Direct panel contribution rendered only by the unique host.
 */
export function createClassicEditorObjectInspectorPanel(
  controller: ClassicEditorObjectWorkspaceController
): ClassicEditorWorkspacePanelContribution {
  let disconnectPanel: (() => void) | undefined;
  const contribution: ClassicEditorWorkspacePanelContribution = {
    id: `object-inspector:${createObjectPanelOccurrence()}`,
    kind: "object",
    title: { en: "Object properties", "zh-CN": "对象属性" },
    connect(panel) {
      disconnectPanel?.();
      disconnectPanel = controller.bindWorkspacePanel(panel, contribution);
      return () => {
        disconnectPanel?.();
        disconnectPanel = undefined;
      };
    },
    mount(context) {
      return mountObjectInspectorPanel(controller, context);
    }
  };
  return contribution;
}

/**
 * Mounts the shared Inspector body inside the unique panel chrome.
 *
 * @param controller - Shared exact-target controller.
 * @param context - Unique panel mount context.
 * @returns Panel-owned Vue lifecycle.
 */
function mountObjectInspectorPanel(
  controller: ClassicEditorObjectWorkspaceController,
  context: ClassicEditorWorkspacePanelMountContext
) {
  const element = context.product.ownerDocument.createElement("div");
  element.className = "qk-object-inspector-panel-content";
  const app = createClassicEditorUiApp(
    ClassicEditorObjectInspectorSurface,
    { controller },
    readClassicEditorAppearance(context.product.root)
  );
  app.mount(element);
  return {
    element,
    updatePanel(): void {
      // The shared controller subscription updates exact target and field state.
    },
    destroy(): void {
      app.unmount();
    }
  };
}

let nextObjectPanelOccurrence = 0;

/** @returns Root-process unique panel occurrence suffix. */
function createObjectPanelOccurrence(): number {
  nextObjectPanelOccurrence += 1;
  return nextObjectPanelOccurrence;
}
