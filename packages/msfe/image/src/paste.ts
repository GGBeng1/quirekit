import { EditorView } from "@quirekit/cm-view";
import type { MsfeCommand, MsfeEditor, MsfeExtension } from "@quirekit/msfe-core";
import { imageUploadTypes, storeImages } from "./upload";
import type { ImageUploader, ImageUploadSource } from "./types";

/** @param text - Image source to insert. @returns One selection-local insertion leaving the cursor after it. */
function insertSource(text: string): MsfeCommand {
  return (state) => {
    if (state.selection.ranges.length !== 1 || !text) return null;
    const { from, to } = state.selection.main;
    return { changes: { from, to, insert: text }, selection: { anchor: from + text.length }, scrollIntoView: true };
  };
}

/**
 * Stores pasted or dropped image files and inserts them where they landed.
 * The landing position is held by a source anchor, so edits made during the upload move it correctly;
 * nothing is written until storing finishes, and a failed image writes nothing.
 * @param uploader - Host storage, or undefined to inline images as `data:` URLs.
 * @returns Installable extension.
 */
export function imageUploads(uploader?: ImageUploader): MsfeExtension {
  let editor: MsfeEditor | undefined;
  const lifetime = new AbortController();

  /** @param files - Candidate transfer files. @returns Accepted image files. */
  function images(files: FileList | null | undefined): File[] {
    return [...files ?? []].filter(file => imageUploadTypes.includes(file.type));
  }

  /** @param files - Images to store. @param position - Source offset to insert at. @param source - Entry point. */
  function start(files: File[], position: number, source: ImageUploadSource): void {
    const owner = editor;
    if (!owner || owner.state.readOnly) return;
    const anchor = owner.captureAnchor({ from: position, to: position });
    void storeImages(uploader, files, source, lifetime.signal).then((markdown) => {
      const target = anchor.target();
      if (markdown && target && !owner.state.readOnly) owner.run(insertSource(markdown), target);
    }).finally(() => anchor.release());
  }

  return {
    id: "msfe-image-uploads",
    onCreate(context) {
      editor = context.editor;
      return () => { editor = undefined; lifetime.abort(); };
    },
    extensions: EditorView.domEventHandlers({
      paste(event, view) {
        const files = images(event.clipboardData?.files);
        // Text or HTML beside the image (such as a copied web page) keeps the ordinary paste path.
        if (!files.length || event.clipboardData?.getData("text/plain").trim()) return false;
        event.preventDefault();
        start(files, view.state.selection.main.head, "paste");
        return true;
      },
      drop(event, view) {
        const files = images(event.dataTransfer?.files);
        if (!files.length) return false;
        event.preventDefault();
        start(files, view.posAtCoords({ x: event.clientX, y: event.clientY }) ?? view.state.selection.main.head, "drop");
        return true;
      },
    }),
  };
}
