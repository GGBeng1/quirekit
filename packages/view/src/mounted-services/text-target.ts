import { TextSelection, type EditorState, type Node } from "@quirekit/pm";
import type { QuireMountedTextTarget } from "./types";

/**
 * Validates ordinary main-document text without crossing an atom or isolated root.
 * @param target - Exact source selection requested by a mounted service.
 * @param doc - Current accepted document.
 * @returns Whether both endpoints belong to one nonisolated textblock.
 */
export function isMainTextTarget(target: QuireMountedTextTarget, doc: Node): boolean {
  if (target.doc !== doc || !Number.isInteger(target.anchor) || !Number.isInteger(target.head)
    || Math.min(target.anchor, target.head) < 0 || Math.max(target.anchor, target.head) > doc.content.size) return false;
  const anchor = doc.resolve(target.anchor);
  const head = doc.resolve(target.head);
  if (!anchor.sameParent(head) || !anchor.parent.isTextblock || anchor.depth < 1) return false;
  for (let depth = 1; depth <= anchor.depth; depth++) {
    if (anchor.node(depth).isAtom || anchor.node(depth).type.spec.isolating) return false;
  }
  return true;
}

/**
 * Checks the accepted selection after canonical plugins have appended transactions.
 * @param target - Target validated against the document before the selection command.
 * @param state - Fully accepted state after command and appendTransaction processing.
 * @returns Whether the same textblock and local endpoints still own ordinary text input.
 */
export function isAcceptedMainTextTarget(target: QuireMountedTextTarget, state: EditorState): boolean {
  const selection = state.selection;
  if (!(selection instanceof TextSelection)
    || !isMainTextTarget({ doc: state.doc, anchor: selection.anchor, head: selection.head }, state.doc)) return false;
  // Absolute positions may move; immutable text identity and local endpoints cannot be substituted.
  const anchor = target.doc.resolve(target.anchor);
  const head = target.doc.resolve(target.head);
  return selection.$anchor.parent === anchor.parent && selection.$head.parent === head.parent
    && selection.$anchor.parentOffset === anchor.parentOffset && selection.$head.parentOffset === head.parentOffset;
}
