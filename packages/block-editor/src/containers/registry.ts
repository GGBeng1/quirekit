import type { QuireEditor, QuireNodeViewRenderer, QuireNodeViewRendererProps } from "@quirekit/core";
import { createBlockContainerSurface } from "./surface";
const renderers = new WeakMap<QuireEditor, QuireNodeViewRenderer>();
/** @param editor - Canonical owner. @param render - Provider-preserving header renderer. @returns Registration cleanup. */
export function registerBlockContainerRenderer(editor: QuireEditor, render: QuireNodeViewRenderer): () => void {
  renderers.set(editor, render);
  return () => { if (renderers.get(editor) === render) renderers.delete(editor); };
}
/** @param props - Retained content environment. @returns Product controls or a framework-free disclosure fallback. */
export function renderBlockContainer(props: QuireNodeViewRendererProps): unknown {
  return renderers.get(props.editor)?.(props) ?? createBlockContainerSurface(props, () => {}, () => {});
}
