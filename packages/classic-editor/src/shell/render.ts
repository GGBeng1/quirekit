import type { ClassicEditorRenderContext } from "../types";
import { renderSidebars } from "./contribution/panels";
import { renderStatus } from "./contribution/status";
import { selectVisibleClassicEditorContributions } from "./contribution/visibility";
import type { ClassicEditorShellRegions } from "./types";

/**
 * Renders every current product contribution into the mounted shell.
 *
 * @param elements - Product shell elements.
 * @param context - Mounted product render context.
 */
export function renderClassicEditorShell(
  elements: ClassicEditorShellRegions,
  context: ClassicEditorRenderContext
): void {
  const contributions = context.instance.registry.contributions;
  renderSidebars(
    elements,
    selectVisibleClassicEditorContributions(contributions, context, "sidebar-panel"),
    context
  );
  renderStatus(
    elements.statusBar,
    selectVisibleClassicEditorContributions(contributions, context, "status-item"),
    context
  );
}
