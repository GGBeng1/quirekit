import type { Editor, Range } from "@quirekit/core";
import type { BlockMediaTarget } from "./types";
import { replaceBlockImage } from "./commands";
/**
 * Opens a local file chooser, preserving the insertion target through asynchronous reading.
 * @param editor - Document session.
 * @param target - Existing image to replace, or an insertion at the captured selection.
 * @param insertion - Captured insertion range, independent of later focus.
 * @returns Whether the chooser was admitted.
 */
export function chooseBlockImage(editor: Editor, target?: BlockMediaTarget, insertion?: Range): boolean {
 if (!editor.isEditable || !editor.state.schema.nodes.image) return false;
 const source = editor.state.pm, range = insertion ?? { from: source.selection.from, to: source.selection.to }, document = editor.view.dom.ownerDocument;
 const input = document.createElement("input"); input.type = "file"; input.accept = "image/png,image/jpeg,image/gif,image/webp,image/avif,image/svg+xml";
 input.addEventListener("change", () => {
  const file = input.files?.[0]; if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
   if (editor.isDestroyed || !editor.isEditable || editor.state.doc !== source.doc || typeof reader.result !== "string") return;
   if (target) replaceBlockImage(editor, target, reader.result, file.name);
   else editor.chain().closeHistory().insertContentAt(range, { type: "image", attrs: { src: reader.result, alt: file.name } }).run();
  }, { once: true });
  reader.readAsDataURL(file);
 }, { once: true });
 input.click(); return true;
}
