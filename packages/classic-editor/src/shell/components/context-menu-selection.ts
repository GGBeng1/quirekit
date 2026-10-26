import type { QuireEditor } from "@quirekit/core";
import type { ClassicEditorContextMenuSelection } from "@classic/types";

/** View hit beneath a context-menu pointer. */
export interface ClassicEditorContextMenuHit {
  /** Nearest text position. */
  readonly pos: number;
  /** Object position when the pointer hit an atomic object. */
  readonly objectPosition?: number | undefined;
}

/**
 * Applies Word's right-click caret rule before the menu resolves its items.
 *
 * A text hit outside the current selection collapses the selection there and
 * an object hit outside it selects that object; a hit inside the selection keeps
 * it so clipboard and formatting items act on it.
 *
 * @param editor - Editor owning the selection.
 * @param hit - View hit beneath the pointer, or null when none resolved.
 */
export function placeClassicEditorContextMenuCaret(
  editor: QuireEditor,
  hit: ClassicEditorContextMenuHit | null
): void {
  if (hit === null) return;
  const { from, to } = editor.state.pm.selection;
  if (hit.objectPosition !== undefined) {
    if (hit.objectPosition < from || hit.objectPosition >= to) {
      editor.commands.setNodeSelection(hit.objectPosition);
    }
    return;
  }
  if (hit.pos >= from && hit.pos <= to) return;
  editor.commands.setTextSelection(hit.pos);
}

/**
 * Captures the current selection range for one context-menu occurrence.
 *
 * @param editor - Editor owning the selection.
 * @returns Immutable selection range.
 */
export function readClassicEditorContextMenuSelection(
  editor: QuireEditor
): ClassicEditorContextMenuSelection {
  const { from, to, empty } = editor.state.pm.selection;
  return Object.freeze({ from, to, empty });
}
