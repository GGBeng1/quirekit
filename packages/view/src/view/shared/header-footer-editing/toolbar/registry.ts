import type { QuireEditor } from "@quirekit/core";
import type {
  QuireHeaderFooterToolbarRegistry,
  QuireHeaderFooterToolbarRenderer
} from "./types";

const registry: QuireHeaderFooterToolbarRegistry = new WeakMap();

/**
 * Installs a product-owned header/footer editing toolbar for one editor.
 *
 * @param editor - Exact editor whose editing sessions receive this toolbar.
 * @param renderer - Product factory; View stays independent of its UI framework.
 * @returns Idempotent release function restoring the previous owner.
 */
export function registerQuireHeaderFooterToolbarRenderer(
  editor: QuireEditor,
  renderer: QuireHeaderFooterToolbarRenderer
): () => void {
  const renderers = registry.get(editor) ?? [];
  registry.set(editor, renderers);
  // Each registration needs its own identity even when callers reuse a factory.
  const entry: QuireHeaderFooterToolbarRenderer = (document, state) => renderer(document, state);
  renderers.push(entry);
  return () => {
    const index = renderers.indexOf(entry);
    if (index >= 0) renderers.splice(index, 1);
  };
}

/**
 * Reads the active product toolbar renderer.
 *
 * @param editor - Exact editor.
 * @returns Most recent renderer, or undefined for the View default.
 */
export function readHeaderFooterToolbarRenderer(
  editor: QuireEditor
): QuireHeaderFooterToolbarRenderer | undefined {
  return registry.get(editor)?.at(-1);
}
