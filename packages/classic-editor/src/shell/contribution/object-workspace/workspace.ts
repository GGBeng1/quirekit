import {
  classicEditorObjectWorkspaceHosts
} from "../../../runtime/object-workspace/host-registry";
import type {
  ClassicEditorMountedRenderable,
  ClassicEditorRenderContext,
  ClassicEditorWorkspacePanelProvider,
  ClassicEditorWorkspaceWidgetContribution
} from "../../../types";
import { mountClassicEditorObjectWorkspace } from "../../components/object-workspace/mount";

/** One always-mounted, root-local host shared by every object feature. */
export const classicEditorObjectWorkspaceContribution:
ClassicEditorWorkspaceWidgetContribution = Object.freeze({
  kind: "workspace-widget",
  id: "workspace.object-shared",
  order: 180,
  mount(context: ClassicEditorRenderContext): ClassicEditorMountedRenderable {
    const mounted = mountClassicEditorObjectWorkspace(context);
    const unregister = classicEditorObjectWorkspaceHosts.register(
      context.instance,
      mounted.controller
    );
    const provider: ClassicEditorWorkspacePanelProvider = {
      element: mounted.element,
      workspacePanel: mounted.workspacePanel,
      /** @param nextContext - Latest context for this exact mounted instance. */
      update(nextContext: ClassicEditorRenderContext): void {
        mounted.update?.(nextContext);
      },
      /** Unregisters the exact host before releasing its transient surfaces. */
      destroy(): void {
        unregister();
        mounted.destroy();
      }
    };
    return provider;
  }
});
