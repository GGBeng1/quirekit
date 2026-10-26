import type { CommandProps, RawCommands } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import { getSearchPluginState, searchPluginKey } from "../plugin/state";
import type { SearchExtensionOptions, SearchMeta, SearchOptions, SearchRange } from "../types";
import {
  activateSearchMatch,
  locateFromSelection,
  type SearchDirection
} from "./navigate";
import { replaceActiveMatch, replaceAllMatches } from "./replace";
import { createReplaceabilityCheck } from "./verdict";

/** Options used when a query omits them. */
const defaultSearchOptions: SearchOptions = { caseSensitive: false, wholeWord: false, ignoreWidth: false };

/**
 * Creates the Search command set.
 *
 * Query and navigation transactions change no document content and are kept
 * out of history; replacement transactions are ordinary undoable edits.
 *
 * @param options - Extension options carrying host hooks.
 * @returns Raw command factories.
 */
export function createSearchCommands(options: SearchExtensionOptions): Pick<RawCommands,
  | "setSearchQuery"
  | "clearSearch"
  | "findNext"
  | "findPrevious"
  | "selectSearchMatch"
  | "replaceSearchMatch"
  | "replaceAllSearchMatches"
> {
  const navigate = (direction: SearchDirection) => () => ({ state, tr, dispatch }: CommandProps) => {
    const { matches } = getSearchPluginState(state);
    const target = locateFromSelection(state, matches, options, direction);
    if (target === null) return false;
    if (dispatch) activateSearchMatch(tr, target, options).setMeta("addToHistory", false);
    return true;
  };
  return {
    setSearchQuery: (text: string, queryOptions?: Partial<SearchOptions>, limit?: SearchRange) => ({ tr, dispatch }: CommandProps) => {
      if (text.length === 0 || (limit !== undefined && limit.to <= limit.from)) return false;
      if (dispatch) {
        tr.setMeta(searchPluginKey, {
          type: "set",
          query: { text, options: { ...defaultSearchOptions, ...queryOptions } },
          limit
        } satisfies SearchMeta).setMeta("addToHistory", false);
      }
      return true;
    },
    clearSearch: () => ({ tr, dispatch }: CommandProps) => {
      if (dispatch) {
        tr.setMeta(searchPluginKey, { type: "clear" } satisfies SearchMeta)
          .setMeta("addToHistory", false);
      }
      return true;
    },
    findNext: navigate("next"),
    findPrevious: navigate("previous"),
    selectSearchMatch: (index: number) => ({ state, tr, dispatch }: CommandProps) => {
      const target = getSearchPluginState(state).matches[index];
      if (target === undefined) return false;
      if (dispatch) activateSearchMatch(tr, target, options).setMeta("addToHistory", false);
      return true;
    },
    replaceSearchMatch: (text: string) => ({ editor, state, tr, dispatch, commands }: CommandProps) => {
      if (!editor.isEditable || getSearchPluginState(state).query === null) return false;
      if (!dispatch) return true;
      // Word semantics: a first press only locates when the selection is not the active match.
      const check = createReplaceabilityCheck(options, state, committedState(editor.state.pm, state), text);
      return replaceActiveMatch(state, tr, options, text, check) || commands.findNext();
    },
    replaceAllSearchMatches: (text: string) => ({ editor, state, tr, dispatch }: CommandProps) => {
      const { query, matches } = getSearchPluginState(state);
      if (!editor.isEditable || query === null || matches.length === 0) return false;
      if (dispatch) {
        const check = createReplaceabilityCheck(options, state, committedState(editor.state.pm, state), text);
        replaceAllMatches(state, tr, text, check);
      }
      return true;
    }
  };
}

/**
 * Returns the real editor state when it still holds the command's document.
 *
 * Trials need a real state to build transactions; inside a chain that already
 * changed the document the trial is skipped and only host rules apply.
 *
 * @param committed - Real editor state.
 * @param state - Command state, possibly a chain facade.
 * @returns Real state for trials, or null.
 */
function committedState(committed: EditorState, state: EditorState): EditorState | null {
  return committed.doc === state.doc ? committed : null;
}
