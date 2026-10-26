import type { QuireEditor, QuireNodeViewRenderer, QuireNodeViewRendererProps } from "@quirekit/core";
const renderers = new WeakMap<QuireEditor, QuireNodeViewRenderer>();

/** @param editor - Owning product session. @param render - Provider-preserving header renderer. @returns Registration cleanup. */
export function registerBlockCodeRenderer(editor: QuireEditor, render: QuireNodeViewRenderer): () => void {
  renderers.set(editor, render);
  return () => { if (renderers.get(editor) === render) renderers.delete(editor); };
}

/** @param props - Retained NodeView environment. @returns Product code view, or the semantic fallback for headless consumers. */
export function renderBlockCode(props: QuireNodeViewRendererProps): unknown { return renderers.get(props.editor)?.(props) ?? null; }
