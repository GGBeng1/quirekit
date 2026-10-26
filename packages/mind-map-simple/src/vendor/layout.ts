import type { MindMapLayout } from "@quirekit/mind-map";
import { simpleLayouts } from "../codec/mapping";
import { installSimpleForest } from "./forest";
import type { SimpleInstance } from "./types";

/**
 * Restores document-owned layout before geometry, including after upstream undo.
 * @param instance - Pinned vendor instance.
 * @param initial - Layout of the initial canonical document.
 * @returns Listener disposal; current renderer lifetime owns each layout object.
 */
export function bindSimpleLayout(instance: SimpleInstance, initial: MindMapLayout): () => void {
  let current = initial;
  /** Projects one history carrier without resetting the world-to-viewport transform. */
  function project(): void {
    const next = instance.renderer.renderTree.data._quirekitLayout ?? initial;
    if (next === current) return;
    instance.opt.layout = simpleLayouts[next];
    instance.renderer.setLayout();
    installSimpleForest(instance); current = next;
  }
  instance.on("node_tree_render_start", project);
  return () => instance.off("node_tree_render_start", project);
}
