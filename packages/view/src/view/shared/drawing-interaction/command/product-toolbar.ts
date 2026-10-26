import { applyDrawingCommandCardPosition } from "./card-style";
import { createDrawingToolbarState, type QuireDrawingToolbarRenderer } from "./renderer";
import type { CreateDrawingCommandCardOptions, DrawingCommandCardController } from "./types";

/**
 * Keeps View's coordinate host separate from the product's single complete toolbar.
 * @param ownerDocument - Document owning the selected-object overlay.
 * @param initial - Accepted selected-object facts.
 * @param renderer - Editor-scoped product toolbar factory.
 * @returns Positioning lifetime that retains the product UI across same-object updates.
 */
export function createProductDrawingToolbar(ownerDocument: Document, initial: CreateDrawingCommandCardOptions,
  renderer: QuireDrawingToolbarRenderer): DrawingCommandCardController {
  const host = ownerDocument.createElement("div");
  host.dataset.qkDrawingContextualCommands = "true";
  host.addEventListener("pointerdown", event => event.stopPropagation());
  applyDrawingCommandCardPosition(host, initial.rect);
  const product = renderer(ownerDocument, createDrawingToolbarState(initial));
  host.append(product.element);
  let destroyed = false;
  return {
    element: host,
    /** @param next - Same-object facts; focus and popup ownership remain in the product. */
    update(next): void {
      applyDrawingCommandCardPosition(host, next.rect);
      product.update(createDrawingToolbarState(next));
    },
    /** Native menu restoration does not apply to product-owned popups. */
    openMenu(): void {},
    /** Releases the single product toolbar and all of its portals exactly once. */
    destroy(): void {
      if (destroyed) return;
      destroyed = true;
      product.destroy();
      host.remove();
    }
  };
}
