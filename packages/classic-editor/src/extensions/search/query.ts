import type { QuireEditor } from "@quirekit/core";
import {
  getSearchSnapshot,
  type SearchOptions,
  type SearchRange,
  type SearchSnapshot
} from "@quirekit/extension-search";
import { classicEditorSelectionPopupSuppressMeta } from "@classic/shell/components/selection-popup/suppression";
import { revealClassicSearchActiveMatch } from "./activation";
import type { ClassicSearchSessionState } from "./types";

/** East Asian scripts, where whole-word matching has no word boundary to rely on. */
const eastAsianText = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/u;

/** Search command that selects a match and must not open the selection popup. */
export type ClassicSearchSelectingCommand =
  | { readonly kind: "next" }
  | { readonly kind: "previous" }
  | { readonly kind: "replace" }
  | { readonly kind: "index"; readonly index: number };

/**
 * @param text - Draft query text.
 * @returns Whether whole-word matching applies to the query.
 */
export function isClassicWholeWordAvailable(text: string): boolean {
  return !eastAsianText.test(text);
}

/**
 * Resolves the engine options for the session drafts.
 *
 * @param state - Session state.
 * @returns Matching options.
 */
export function readClassicSearchOptions(state: ClassicSearchSessionState): SearchOptions {
  return {
    caseSensitive: state.caseSensitive,
    wholeWord: state.wholeWord && isClassicWholeWordAvailable(state.findText),
    ignoreWidth: state.ignoreWidth
  };
}

/**
 * Resolves the range the drafts limit the search to.
 *
 * @param state - Session state.
 * @returns Limiting range, or undefined for the whole scope.
 */
export function readClassicSearchLimit(state: ClassicSearchSessionState): SearchRange | undefined {
  return state.inSelection && state.scopeRange !== null ? state.scopeRange : undefined;
}

/**
 * Checks whether the committed engine query already matches the session drafts.
 *
 * @param snapshot - Engine search snapshot.
 * @param state - Session state.
 * @returns Whether no recommit is needed.
 */
export function isClassicSearchCommitted(
  snapshot: SearchSnapshot,
  state: ClassicSearchSessionState
): boolean {
  const options = readClassicSearchOptions(state);
  const query = snapshot.query;
  return query !== null
    && snapshot.limited === (readClassicSearchLimit(state) !== undefined)
    && query.text === state.findText
    && query.options.caseSensitive === options.caseSensitive
    && query.options.wholeWord === options.wholeWord
    && query.options.ignoreWidth === options.ignoreWidth;
}

/**
 * Commits the draft query when it differs from the active one.
 *
 * @param editor - Searched editor.
 * @param state - Session state.
 * @returns Whether a non-empty query is active.
 */
export function commitClassicSearch(editor: QuireEditor, state: ClassicSearchSessionState): boolean {
  if (state.findText.length === 0) {
    editor.commands.clearSearch();
    return false;
  }
  if (!isClassicSearchCommitted(getSearchSnapshot(editor.state.pm), state)) {
    editor.commands.setSearchQuery(state.findText, readClassicSearchOptions(state), readClassicSearchLimit(state));
  }
  return true;
}

/**
 * Commits the query, then runs one selecting command without opening the selection popup.
 *
 * @param editor - Searched editor.
 * @param state - Session state.
 * @param command - Navigation, replacement, or direct selection.
 * @returns Whether a query was active.
 */
export function selectClassicSearchMatch(
  editor: QuireEditor,
  state: ClassicSearchSessionState,
  command: ClassicSearchSelectingCommand
): boolean {
  if (!commitClassicSearch(editor, state)) return false;
  const chain = editor.chain();
  const selected = command.kind === "next"
    ? chain.findNext()
    : command.kind === "previous"
      ? chain.findPrevious()
      : command.kind === "replace"
        ? chain.replaceSearchMatch(state.replaceText)
        : chain.selectSearchMatch(command.index);
  selected.setMeta(classicEditorSelectionPopupSuppressMeta, true).run();
  revealClassicSearchActiveMatch(editor);
  return true;
}
