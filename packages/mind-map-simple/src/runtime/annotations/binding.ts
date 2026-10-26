import type { SimpleInstance } from "../../vendor/types";
import { annotationGeometry } from "./geometry";
import { annotationElement, drawMindMapAnnotation } from "./drawing";

/** @param instance - Owned renderer. @param mount - Input and theme boundary.
 * @returns Idempotent cleanup for instance-local annotation layers and subscription. */
export function bindMindMapAnnotations(instance: SimpleInstance, mount: HTMLElement): () => void {
  const world = instance.draw.node;
  const underlay = annotationElement(world, "g", { "data-qk-mind-annotations": "back", "pointer-events": "none" });
  const overlay = annotationElement(world, "g", { "data-qk-mind-annotations": "front", "pointer-events": "none" });
  let closed = false;
  /** Reuses one completed layout; view transforms and selection changes do no annotation work. */
  function render(): void {
    if (closed) return;
    world.prepend(underlay); world.append(overlay); underlay.replaceChildren(); overlay.replaceChildren();
    const entries = instance.renderer.renderTree.data._quirekitAnnotations ?? [];
    if (!entries.length) return;
    const geometry = annotationGeometry(instance), style = getComputedStyle(mount);
    const primary = style.getPropertyValue("--qk-mind-accent").trim() || "#4855ec";
    const surface = style.getPropertyValue("--qk-mind-surface").trim() || "#ffffff";
    underlay.setAttribute("font-family", style.fontFamily); overlay.setAttribute("font-family", style.fontFamily);
    for (const item of entries) drawMindMapAnnotation(item, geometry, item.kind === "boundary" ? underlay : overlay, primary, surface);
  }
  instance.on("node_tree_render_end", render); render();
  return () => { if (closed) return; closed = true; instance.off("node_tree_render_end", render); underlay.remove(); overlay.remove(); };
}
