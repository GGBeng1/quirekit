import type { QuireEditor, QuireNodeViewRenderer, QuireNodeViewRendererProps } from "@quirekit/core";

const renderers = new WeakMap<QuireEditor, QuireNodeViewRenderer>();

/** Registers the product's provider-preserving renderer before its document mounts.
 * @param editor - Instance owning the Vue shell.
 * @param render - Renderer with that shell's lifetime.
 * @returns Registration cleanup.
 */
export function registerBlockDataViewRenderer(editor: QuireEditor, render: QuireNodeViewRenderer): () => void {
  renderers.set(editor, render);
  return () => { if (renderers.get(editor) === render) renderers.delete(editor); };
}

/** Uses the current product host, preserving a static fallback for framework-free mounts.
 * @param props - Current retained node view environment.
 * @returns Inline view or null when no UI host is mounted.
 */
export function renderBlockDataView(props: QuireNodeViewRendererProps): unknown {
  return renderers.get(props.editor)?.(props) ?? null;
}
