import type { ClassicEditorRenderContext } from "../../types";
import type {
  ClassicEditorWorkspacePanelHostProjection,
  ClassicEditorWorkspacePanelProductContext
} from "../../types/workspace-panel";

/**
 * Projects immutable Host facts without exposing execution controllers.
 *
 * @param context - Mounted product render context.
 * @returns Read-only resource-job and task snapshots for panel presentation.
 */
export function projectClassicEditorWorkspacePanelHost(
  context: ClassicEditorRenderContext
): ClassicEditorWorkspacePanelHostProjection {
  return Object.freeze({
    resourceJob: context.instance.hostResources.snapshot,
    tasks: context.instance.tasks.snapshot
  });
}

/**
 * Narrows mounted product facts so panel content never receives a Classic
 * instance, Host execution controller, or legacy mutation executor.
 *
 * @param context - Mounted product render context.
 * @returns Frozen typed product facts suitable for direct editor commands.
 */
export function projectClassicEditorWorkspacePanelProduct(
  context: ClassicEditorRenderContext
): ClassicEditorWorkspacePanelProductContext {
  return Object.freeze({
    editor: context.editor,
    root: context.root,
    ownerDocument: context.ownerDocument,
    features: context.features,
    locale: context.locale,
    backend: context.backend,
    ui: context.ui
  });
}
