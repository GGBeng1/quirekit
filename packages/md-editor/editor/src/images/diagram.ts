import type { MsfeEditor } from "@quirekit/msfe-core";
import type { MdImageStorage } from "./types";

/** Host storage of each mounted editor, read by the diagram dialogs that only receive the editor. */
const storages = new WeakMap<MsfeEditor, MdImageStorage>();

/**
 * @param editor - Mounted source owner.
 * @param storage - Host image storage; absent clears it.
 */
export function setMdImageStorage(editor: MsfeEditor, storage: MdImageStorage | undefined): void {
  if (storage) storages.set(editor, storage);
  else storages.delete(editor);
}

/**
 * Diagram preview upload backed by the editor's image storage.
 * @param editor - Mounted source owner.
 * @returns Upload for flowchart, mind map and whiteboard previews, or undefined to keep previews inline.
 */
export function mdDiagramPreviewUpload(editor: MsfeEditor): ((image: Blob, context: { readonly signal: AbortSignal; readonly name: string }) => Promise<string>) | undefined {
  const storage = storages.get(editor);
  return storage && ((image, { signal, name }) => storage.upload(image, { signal, source: "diagram", ...(name ? { name: `${name}.png` } : {}) }));
}
