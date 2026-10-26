import { mindMapSelectionBounds } from "../overview/query";
import type { MindMapEditor } from "../../types";
import type { SimpleInstance } from "../../vendor/types";
import type { bindMindMapViewport } from "./binding";
import { settleMindMapLayout } from "../layout";

/**
 * Owns public viewport intentions independently of source mutation/history.
 * @param instance - Current geometry and native text owner.
 * @param viewport - Instance-local coordinate projection.
 * @param assertActive - Lifetime and composition guard.
 * @returns Bounded viewport commands.
 */
export function createMindMapViewportController(instance: SimpleInstance, viewport: ReturnType<typeof bindMindMapViewport>,
  assertActive: () => void): Pick<MindMapEditor, "setZoom" | "fit" | "center" | "resize" | "panTo" | "fitSelection"> {
  return {
    /** @param point - Unscaled world point. */
    panTo(point) {
      assertActive();
      if (![point.x, point.y].every(Number.isFinite)) throw new TypeError("Invalid mind map viewport point");
      instance.renderer.textEdit.hideEditTextBox();
      instance.view.translateXY(instance.width / 2 - point.x * instance.view.scale - instance.view.x,
        instance.height / 2 - point.y * instance.view.scale - instance.view.y);
    },
    /** @returns Whether the current visible selection could be fitted. */
    async fitSelection() {
      assertActive(); instance.renderer.textEdit.hideEditTextBox();
      await settleMindMapLayout(instance); assertActive();
      const bounds = mindMapSelectionBounds(instance.renderer.activeNodeList);
      if (!bounds) return false; viewport.fitBounds(bounds); return true;
    },
    /** @param scale - Absolute zoom ratio. */
    setZoom(scale) { assertActive(); instance.renderer.textEdit.hideEditTextBox(); viewport.setZoom(scale); },
    /** @returns Completion of fitting the latest committed text geometry. */
    async fit() {
      assertActive(); instance.renderer.textEdit.hideEditTextBox();
      await settleMindMapLayout(instance); assertActive(); viewport.fit();
    },
    /** @returns Completion of centering the latest geometry at its current zoom. */
    async center() {
      assertActive(); instance.renderer.textEdit.hideEditTextBox();
      await settleMindMapLayout(instance); assertActive(); viewport.center();
    },
    /** @returns Completion of layout at the host's current dimensions. */
    async resize() {
      assertActive(); instance.resize(); await settleMindMapLayout(instance); assertActive();
    },
  };
}
