import { computed, onBeforeUnmount, ref, shallowRef } from "vue";
import type { QuireEditor, QuireEditorTransactionEvent } from "@quirekit/core";
import { getSearchSnapshot } from "@quirekit/extension-search";
import {
  commitClassicSearch,
  isClassicSearchCommitted,
  isClassicWholeWordAvailable,
  selectClassicSearchMatch,
  type ClassicSearchSelectingCommand
} from "./query";
import type { ClassicSearchSession } from "./session";

/**
 * Binds the panel to editor search state and exposes its actions.
 *
 * @param editor - Editor searched by the panel.
 * @param session - Root-local session holding drafts and options.
 * @returns Reactive search state and panel actions.
 */
export function useClassicSearchPanel(editor: QuireEditor, session: ClassicSearchSession) {
  const state = session.state;
  const snapshot = shallowRef(getSearchSnapshot(editor.state.pm));
  const editable = ref(editor.isEditable);

  /** Refreshes derived search and editability state after editor changes. */
  function refresh(): void {
    snapshot.value = getSearchSnapshot(editor.state.pm);
    editable.value = editor.isEditable;
    if (!editable.value) state.mode = "find";
  }

  /**
   * Maps the captured range through one transaction, then refreshes.
   *
   * @param event - Applied transaction.
   */
  function handleTransaction(event: QuireEditorTransactionEvent): void {
    const range = state.scopeRange;
    if (range !== null && event.transaction.docChanged) {
      // Edits at either boundary stay inside the captured range, matching the engine's mapping.
      const mapping = event.transaction.mapping;
      state.scopeRange = { from: mapping.map(range.from, -1), to: mapping.map(range.to, 1) };
    }
    refresh();
  }
  editor.on("transaction", handleTransaction);
  editor.on("update", refresh);
  onBeforeUnmount(() => {
    editor.off("transaction", handleTransaction);
    editor.off("update", refresh);
    if (!editor.isDestroyed) editor.commands.clearSearch();
  });

  const wholeWordAvailable = computed(() => isClassicWholeWordAvailable(state.findText));
  const committed = computed(() => isClassicSearchCommitted(snapshot.value, state));

  /** Re-runs an already committed search after an option changes. */
  function recommitIfActive(): void {
    if (snapshot.value.query !== null) commitClassicSearch(editor, state);
  }

  /**
   * Runs one selecting command without opening the selection popup on the match.
   *
   * @param command - Navigation, replacement, or direct selection.
   */
  function select(command: ClassicSearchSelectingCommand): void {
    selectClassicSearchMatch(editor, state, command);
  }

  /** Replaces every match in one undoable step. */
  function replaceAll(): void {
    if (commitClassicSearch(editor, state)) editor.commands.replaceAllSearchMatches(state.replaceText);
  }

  return { state, snapshot, editable, committed, wholeWordAvailable, recommitIfActive, select, replaceAll };
}
