import type { Editor } from "@quirekit/core";

const hosts = new WeakMap<Editor, (position: number) => void>();

/** @param editor - Document owner. @param open - Product gallery opener. @returns Instance-scoped cleanup. */
export function registerBlockMediaPreview(editor: Editor, open: (position: number) => void): () => void {
  hosts.set(editor, open);
  return () => { if (hosts.get(editor) === open) hosts.delete(editor); };
}

/** @param editor - Document owner. @param position - Requested source atom. @returns Whether a product preview host accepted the request. */
export function openBlockMediaPreview(editor: Editor, position: number): boolean {
  const open = hosts.get(editor);
  if (!open || editor.isDestroyed) return false;
  open(position); return true;
}
