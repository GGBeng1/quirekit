import type { Editor } from "@quirekit/core";
import type { BlockMediaPresentation, BlockMediaTarget } from "./types";
import { readMediaPresentation } from "./presentation";
const types = new Set(["image", "flowchart", "mindMap", "textDiagram", "whiteboard"]);
/** @param editor - Document session. @returns A single complete media atom, whether selected from its body or its block handle. */
export function captureBlockMedia(editor: Editor): BlockMediaTarget | null {
 const { doc, selection } = editor.state.pm;
 const node = doc.nodeAt(selection.from);
 return node && types.has(node.type.name) && selection.to === selection.from + node.nodeSize ? { doc, pos: selection.from, node } : null;
}
/** @param editor - Command owner. @param target - Captured source. @returns Whether delayed work still owns that object and selection. */
export function mediaTargetCurrent(editor: Editor, target: BlockMediaTarget): boolean {
 const selected = captureBlockMedia(editor);
 return !editor.isDestroyed && editor.isEditable && selected?.doc === target.doc && selected.node === target.node && selected.pos === target.pos;
}
/** @param editor - Command owner. @param target - Exact source. @param patch - Display-only edit. @returns Atomic one-step history completion. */
export function updateBlockMedia(editor: Editor, target: BlockMediaTarget, patch: Partial<BlockMediaPresentation>): boolean {
 if (!mediaTargetCurrent(editor, target)) return false;
 const media = readMediaPresentation({ ...readMediaPresentation(target.node.attrs.media), ...patch });
 return editor.chain().closeHistory().updateAttributes(target.node.type, { media }).run();
}
/** @param editor - Document owner. @param target - Exact selected source. @param src - Validated raster source. @param alt - Accessible description. @returns Atomic source replacement. */
export function replaceBlockImage(editor: Editor, target: BlockMediaTarget, src: string, alt: string): boolean {
 if (!mediaTargetCurrent(editor, target) || target.node.type.name !== "image") return false;
 return editor.chain().closeHistory().updateAttributes(target.node.type, { src, alt }).run();
}
