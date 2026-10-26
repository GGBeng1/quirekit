import { ClassicEditorObjectWorkspaceRuntime } from "../../../runtime/object-workspace";
import type {
  ClassicEditorRenderContext,
  ClassicEditorWorkspacePanelProvider
} from "../../../types";
import type {
  ClassicEditorObjectWorkspaceContribution,
  ClassicEditorObjectWorkspaceController
} from "../../../types/object-workspace";
import { readClassicEditorAppearance } from "../../appearance";
import { createClassicEditorUiApp } from "../../vue-app";
import { createClassicEditorObjectInspectorPanel } from "../../contribution/object-workspace/panel";
import ClassicEditorObjectWorkspaceHost from "./object-workspace-host.vue";

/** Mounted object workspace plus direct target and panel authorities. */
export interface MountedClassicEditorObjectWorkspace
extends ClassicEditorWorkspacePanelProvider {
  /** Root-local host node appended by the workspace contribution. */
  readonly element: HTMLElement;
  /** One typed controller shared by every object projection. */
  readonly controller: ClassicEditorObjectWorkspaceController;
  /** @param contribution - Exact object contribution to activate. @returns Whether it changed. */
  activate(contribution: ClassicEditorObjectWorkspaceContribution): boolean;
}

/**
 * Mounts one reusable object workspace presenter for a Classic root.
 *
 * @param context - Mounted product context.
 * @returns Root-local lifecycle, controller, and unique-panel contribution.
 */
export function mountClassicEditorObjectWorkspace(
  context: ClassicEditorRenderContext
): MountedClassicEditorObjectWorkspace {
  const element = context.ownerDocument.createElement("div");
  const controller = new ClassicEditorObjectWorkspaceRuntime(context);
  const workspacePanel = createClassicEditorObjectInspectorPanel(controller);
  const app = createClassicEditorUiApp(
    ClassicEditorObjectWorkspaceHost,
    { controller },
    readClassicEditorAppearance(controller.context.root)
  );
  element.className = "qk-object-workspace-host";
  app.mount(element);
  return {
    element,
    controller,
    workspacePanel,
    activate: (contribution) => controller.activate(contribution),
    /** @param nextContext - Latest root-local product context. */
    update(nextContext: ClassicEditorRenderContext): void {
      controller.updateContext(nextContext);
    },
    /** Releases Vue, transient surfaces, and the exact target. */
    destroy(): void {
      controller.clear("unmount");
      app.unmount();
    }
  };
}
