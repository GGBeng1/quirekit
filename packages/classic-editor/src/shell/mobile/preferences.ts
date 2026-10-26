import type { ClassicEditorUiController } from "../../types";
import type { ClassicMobileDesktopPreferences } from "./types";

// UI ownership survives theme/locale Shell replacement. Primitive preferences
// must not keep an editor, document, or semantic snapshot alive through this map.
const desktopPreferences = new WeakMap<ClassicEditorUiController, ClassicMobileDesktopPreferences>();

/**
 * Applies a breakpoint transition once per UI owner, including Shell remounts.
 * @param ui - Instance-owned UI state, independent from the current Shell.
 * @param compact - Whether the current host requires mobile presentation.
 */
export function reconcileClassicMobilePreferences(ui: ClassicEditorUiController, compact: boolean): void {
  if (compact) {
    if (desktopPreferences.has(ui)) return;
    const state = ui.state;
    desktopPreferences.set(ui, {
      zoom: state.zoom, zoomMode: state.zoomMode,
      leftVisible: state.leftSidebar.visible, rightVisible: state.rightSidebar.visible
    });
    // Record the transition before synchronous UI subscribers re-enter it.
    ui.setSidebarVisible("left", false);
    ui.setSidebarVisible("right", false);
    ui.setZoomMode("fit-content");
    return;
  }
  const saved = desktopPreferences.get(ui);
  if (!saved) return;
  desktopPreferences.delete(ui);
  ui.setSidebarVisible("left", saved.leftVisible);
  ui.setSidebarVisible("right", saved.rightVisible);
  ui.setZoom(saved.zoom);
  ui.setZoomMode(saved.zoomMode);
}
