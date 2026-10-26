import { EditorSelection, type EditorState } from "@quirekit/cm-state";
import { EditorView } from "@quirekit/cm-view";
import { readSourcePresentation, type MsfeEditor } from "@quirekit/msfe-core";
import type { MobileClipboardIntent, MobileClipboardResult } from "./types";

/**
 * Captures one exact intent; moving away and back cannot revive a cancelled request.
 * @param editor - Canonical source, permissions and document lifetime.
 * @returns A single anchor with constant-work invalidation, released by its caller.
 */
export function captureMobileClipboard(editor: MsfeEditor): MobileClipboardIntent {
  const initial = editor.state, selection = initial.selection, mode = editor.mode;
  const documentScope = editor.documentScope, scope = documentScope.fork(), revision = editor.revision;
  const anchor = editor.captureAnchor(selection.main);
  scope.own(() => anchor.release());

  /** @param state - Latest accepted source state. @returns Exact source/selection and permission validity, without slicing text. */
  function matches(state: EditorState): boolean {
    return state.doc === initial.doc && selection.eq(state.selection) && state.readOnly === initial.readOnly
      && editor.mode === mode && editor.revision === revision && editor.documentScope === documentScope
      && !readSourcePresentation(state).composing;
  }
  scope.own(editor.subscribeState({ select: matches, change: valid => { if (!valid) scope.dispose(); } }));
  /** @returns Whether platform completion may still affect this source or its UI. */
  function current(): boolean {
    const view = EditorView.findFromDOM(editor.element);
    return !scope.disposed && matches(editor.state) && !view?.composing && !view?.compositionStarted;
  }
  /** @returns Whether the captured source may be changed now. */
  function writable(): boolean { return current() && !editor.state.readOnly && editor.mode !== "locked"; }

  /** @param cut - Requested deletion. @param publish - Synchronous entry into the platform write. @returns Publication and optional source deletion. */
  async function copy(cut: boolean, publish: (source: string) => Promise<void>): Promise<MobileClipboardResult> {
    if (!current() || selection.main.empty || cut && !writable()) return "conflict";
    try {
      await publish(initial.sliceDoc(selection.main.from, selection.main.to));
      if (!current()) return "conflict";
      if (!cut) return "accepted";
      const target = writable() ? anchor.target() : null;
      if (!target) return "conflict";
      return editor.run(() => ({ changes: { from: selection.main.from, to: selection.main.to, insert: "" },
        selection: EditorSelection.cursor(selection.main.from), userEvent: "delete.cut", scrollIntoView: true }), target).ok ? "accepted" : "conflict";
    } catch { return current() ? "failed" : "conflict"; }
  }
  /** @param text - Plain text from the platform or the dedicated form. @returns Atomic paste, preserving filters, rules and history. */
  function paste(text: string): MobileClipboardResult {
    if (!writable()) return "conflict";
    if (!text) return "empty";
    try {
      // Apply the public clipboard pipeline before the single canonical write.
      // Empty or filtered-out text must never erase the user's original range.
      for (const filter of initial.facet(EditorView.clipboardInputFilter)) text = filter(text, initial);
      if (!text) return "empty";
      const target = writable() ? anchor.target() : null;
      if (!target) return "conflict";
      return editor.run(state => ({ ...state.replaceSelection(state.toText(text)), userEvent: "input.paste", scrollIntoView: true }), target).ok ? "accepted" : "conflict";
    } catch { return current() ? "failed" : "conflict"; }
  }
  return { signal: scope.signal, current, copy, paste, release: () => scope.dispose() };
}
