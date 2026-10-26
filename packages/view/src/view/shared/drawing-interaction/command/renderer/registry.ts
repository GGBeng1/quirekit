import type { QuireEditor } from "@quirekit/core";
import type { DrawingToolbarRegistry, QuireDrawingToolbarRenderer } from "./types";

const registries = new WeakMap<QuireEditor, DrawingToolbarRegistry>();

/** @param editor - Editor instance owning the controls. @returns Editor-local registry. */
function registryFor(editor: QuireEditor): DrawingToolbarRegistry {
  let registry = registries.get(editor);
  if (!registry) {
    registry = { renderers: [], listeners: new Set() };
    registries.set(editor, registry);
  }
  return registry;
}

/**
 * Installs product-owned drawing appearance controls for one editor instance.
 * @param editor - Exact editor whose selected drawings receive these controls.
 * @param renderer - Product factory; View remains independent of its UI framework.
 * @returns Idempotent release function that restores the previous active owner.
 */
export function registerQuireDrawingToolbarRenderer(
  editor: QuireEditor,
  renderer: QuireDrawingToolbarRenderer
): () => void {
  const registry = registryFor(editor);
  // Give every registration its own identity even when callers reuse a factory.
  const entry: QuireDrawingToolbarRenderer = (document, state) => renderer(document, state);
  registry.renderers.push(entry);
  for (const listener of registry.listeners) listener();
  return () => {
    const index = registry.renderers.indexOf(entry);
    if (index < 0) return;
    const active = index === registry.renderers.length - 1;
    registry.renderers.splice(index, 1);
    if (active) for (const listener of registry.listeners) listener();
  };
}

/** @param editor - Exact editor. @returns Current product renderer, if registered. */
export function readDrawingToolbarRenderer(editor: QuireEditor): QuireDrawingToolbarRenderer | undefined {
  return registries.get(editor)?.renderers.at(-1);
}

/**
 * Observes product registration changes without subscribing to editor transactions.
 * @param editor - Editor instance owning the registration.
 * @param listener - Refreshes currently selected command chrome.
 * @returns Idempotent listener release function.
 */
export function observeDrawingToolbarRenderer(editor: QuireEditor, listener: () => void): () => void {
  const registry = registryFor(editor);
  registry.listeners.add(listener);
  return () => { registry.listeners.delete(listener); };
}
