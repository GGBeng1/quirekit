import type { QuireEditor } from "@quirekit/core";
import { Selection, type SelectionBookmark } from "@quirekit/pm";

/** Body selection held across one header/footer editing session. */
export interface HeaderFooterBodySelectionMemory {
  /** Records the current selection unless a session switch already holds one. */
  remember(): void;
  /**
   * Restores the remembered selection, at the nearest valid position if the document changed.
   *
   * @returns Whether a remembered selection was restored.
   */
  restore(): boolean;
  /** Drops the remembered selection when a pointer gesture decides the new one. */
  forget(): void;
}

/**
 * Remembers where the body selection was before a header/footer session.
 *
 * Moving between stories keeps the first record, so exiting returns to the
 * body position held before the first story was entered.
 *
 * @param editor - Editor whose canonical selection is remembered.
 * @returns Selection memory for one mounted view.
 */
export function createHeaderFooterBodySelectionMemory(
  editor: QuireEditor
): HeaderFooterBodySelectionMemory {
  let saved: SelectionBookmark | null = null;

  return {
    remember(): void {
      saved ??= editor.state.pm.selection.getBookmark();
    },
    restore(): boolean {
      const bookmark = saved;
      saved = null;
      if (bookmark === null) return false;
      const { doc, tr } = editor.state.pm;
      let selection: Selection;
      try {
        selection = bookmark.resolve(doc);
      } catch {
        selection = Selection.atStart(doc);
      }
      editor.dispatchTransaction(tr.setSelection(selection).setMeta("addToHistory", false));
      return true;
    },
    forget(): void {
      saved = null;
    }
  };
}
