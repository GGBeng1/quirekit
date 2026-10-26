import {
  DecorationSet,
  Plugin,
  PluginKey,
  type EditorState,
  type Transaction
} from "@quirekit/pm";
import { updateSearchMatches } from "../match/incremental";
import { countExcludedMatches, excludedRegionChanged } from "./excluded";
import { limitSearchScope, resolveSearchScope, scanSearchScope } from "../match/scan";
import type {
  SearchExtensionOptions,
  SearchMatch,
  SearchMeta,
  SearchPluginState,
  SearchSnapshot
} from "../types";
import {
  buildSearchDecorations,
  composeSearchDecorations,
  updateSearchDecorations
} from "./decorations";

/** Step count above which highlights are rebuilt rather than mapped. */
const bulkStepThreshold = 32;

/** Plugin key owning transient search state. */
export const searchPluginKey = new PluginKey<SearchPluginState>("quirekit-search");

/** State used while no query is committed. */
const inactiveSearchState: SearchPluginState = {
  query: null,
  matches: [],
  active: null,
  decorations: DecorationSet.empty,
  presentation: DecorationSet.empty,
  lastReplaceAll: null,
  excludedCount: 0,
  limit: null,
  version: 0
};

/**
 * Creates the search plugin.
 *
 * @param options - Extension options carrying host hooks and colors.
 * @returns ProseMirror plugin.
 */
export function createSearchPlugin(options: SearchExtensionOptions): Plugin<SearchPluginState> {
  return new Plugin<SearchPluginState>({
    key: searchPluginKey,
    state: {
      init: () => inactiveSearchState,
      apply: (tr, value, _oldState, newState) => applySearchTransaction(tr, value, newState, options)
    },
    props: {
      decorations: (state: EditorState) => searchPluginKey.getState(state)?.presentation ?? null
    }
  });
}

/**
 * Advances search state for one transaction.
 *
 * Phase order matters: document changes are mapped first so a meta in the same
 * transaction (such as activating the next match after a replacement) refers to
 * the new document.
 *
 * @param tr - Applied transaction.
 * @param value - Previous plugin state.
 * @param state - New editor state.
 * @param options - Extension options.
 * @returns Next plugin state.
 */
function applySearchTransaction(
  tr: Transaction,
  value: SearchPluginState,
  state: EditorState,
  options: SearchExtensionOptions
): SearchPluginState {
  const meta = tr.getMeta(searchPluginKey) as SearchMeta | undefined;
  if (meta?.type === "clear") return { ...inactiveSearchState, version: value.version + 1 };
  if (meta?.type === "set") {
    const limit = meta.limit ?? null;
    const segments = limitSearchScope(resolveSearchScope(options, state), limit);
    const matches = scanSearchScope(state.doc, segments, meta.query);
    const decorations = buildSearchDecorations(state.doc, matches, options.highlight);
    return withPresentation({
      query: meta.query,
      matches,
      active: null,
      decorations,
      presentation: decorations,
      lastReplaceAll: null,
      // A limited search never reaches excluded stories, so it reports none.
      excludedCount: limit === null ? countExcludedMatches(state, meta.query, options) : 0,
      limit,
      version: value.version + 1
    }, state, options);
  }
  if (value.query === null) return value;

  let next = value;
  if (tr.docChanged) {
    // Edits at either boundary stay inside the limit.
    const limit = value.limit === null
      ? null
      : { from: tr.mapping.map(value.limit.from, -1), to: tr.mapping.map(value.limit.to, 1) };
    const segments = limitSearchScope(resolveSearchScope(options, state), limit);
    const update = updateSearchMatches(value.matches, tr, segments, value.query);
    next = {
      ...value,
      limit,
      matches: update.matches,
      active: mapActiveMatch(value.active, tr, update.matches),
      // A later edit or undo makes the previous replace-all outcome stale.
      lastReplaceAll: null,
      excludedCount: limit === null && excludedRegionChanged(tr, state, options)
        ? countExcludedMatches(state, value.query, options)
        : value.excludedCount,
      // Mapping a decoration tree costs per step, so bulk edits rebuild it from the matches instead.
      decorations: tr.steps.length > bulkStepThreshold
        ? buildSearchDecorations(state.doc, update.matches, options.highlight)
        : updateSearchDecorations(
          value.decorations,
          tr,
          update.rescanned,
          update.added,
          options.highlight
        ),
      version: value.version + 1
    };
  }
  if (meta?.type === "activate") {
    next = { ...next, active: meta.match, version: next.version + 1 };
  } else if (meta?.type === "replaced-all") {
    next = { ...next, active: null, lastReplaceAll: meta.result, version: next.version + 1 };
  }
  return next === value ? value : withPresentation(next, state, options);
}

/**
 * Maps the active match and keeps it only while it is still a match.
 *
 * @param active - Active match in the old document.
 * @param tr - Document-changing transaction.
 * @param matches - Matches in the new document.
 * @returns Active match in the new document, or null.
 */
function mapActiveMatch(
  active: SearchMatch | null,
  tr: Transaction,
  matches: readonly SearchMatch[]
): SearchMatch | null {
  if (active === null) return null;
  const from = tr.mapping.map(active.from, 1);
  const to = tr.mapping.map(active.to, -1);
  return matches.find((match) => match.from === from && match.to === to) ?? null;
}

/**
 * Recomputes the cached decoration source for a state.
 *
 * @param value - Plugin state without an up-to-date presentation.
 * @param state - Editor state owning the document.
 * @param options - Extension options.
 * @returns Plugin state with presentation.
 */
function withPresentation(
  value: SearchPluginState,
  state: EditorState,
  options: SearchExtensionOptions
): SearchPluginState {
  return {
    ...value,
    presentation: composeSearchDecorations(
      state.doc,
      value.decorations,
      value.active,
      options.highlight
    )
  };
}

/**
 * Reads the full plugin state.
 *
 * @param state - Editor state.
 * @returns Search plugin state, inactive when the plugin is absent.
 */
export function getSearchPluginState(state: EditorState): SearchPluginState {
  return searchPluginKey.getState(state) ?? inactiveSearchState;
}

/**
 * Summarizes search state for product UI.
 *
 * @param state - Editor state.
 * @returns Query, count, active index, and version.
 */
export function getSearchSnapshot(state: EditorState): SearchSnapshot {
  const value = getSearchPluginState(state);
  const active = value.active;
  return {
    query: value.query,
    count: value.matches.length,
    activeIndex: active === null
      ? -1
      : value.matches.findIndex((match) => match.from === active.from && match.to === active.to),
    lastReplaceAll: value.lastReplaceAll,
    excludedCount: value.excludedCount,
    limited: value.limit !== null,
    version: value.version
  };
}
