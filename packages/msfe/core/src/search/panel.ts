import { runScopeHandlers, type EditorView, type Panel } from "@quirekit/cm-view";
import { indexSearchMatches, readSearchMatches, type SearchMatchIndex } from "./count";
import { SearchQuery, getSearchQuery, setSearchQuery, findNext, findPrevious, selectMatches, replaceNext, replaceAll, closeSearchPanel } from "@quirekit/cm-search";
import { compositionField } from "../state/fields";
import { TaskScope } from "../tasks/scope";
import { defaultEditorIcon } from "../presentation/icons";
import type { MsfeEditorOptions } from "../editor/types";
import type { SearchAction, SearchPanelProps } from "./types";
import { nativeSearchPanel } from "./native";

/**
 * Bridges one CM search panel to a host component without publishing document text.
 * @param view - Canonical search/query owner. @param options - Renderer and provider dependencies.
 * @returns Retained panel with stale-action rejection and native keyboard scope.
 */
export function createSearchPanel(view: EditorView, options: Pick<MsfeEditorOptions, "icons" | "searchPanel" | "componentHost" | "onError">): Panel {
  const dom = view.dom.ownerDocument.createElement("div"); dom.className = "msfe-search-panel";
  const scope = new TaskScope(options.onError);
  let panelComposing = false;
  const commands = { next: findNext, previous: findPrevious, all: selectMatches, replace: replaceNext, replaceAll, close: closeSearchPanel };
  /** @param action - Explicit panel intent. @returns Whether the still-current query can run. */
  function run(action: SearchAction): boolean {
    if (scope.disposed || panelComposing || view.state.field(compositionField)) return false;
    if ((action === "replace" || action === "replaceAll") && view.state.readOnly) return false;
    if (action !== "close" && !getSearchQuery(view.state).valid) return false;
    return commands[action](view);
  }
  let index: SearchMatchIndex | undefined;
  /** @returns Small panel state; matches are rescanned only when the query or document changed. */
  function snapshot(): SearchPanelProps {
    const query = getSearchQuery(view.state), { main } = view.state.selection;
    index = indexSearchMatches(view.state, query, index);
    return { query: { search: query.search, replace: query.replace, caseSensitive: query.caseSensitive, regexp: query.regexp, wholeWord: query.wholeWord },
      matches: readSearchMatches(index, main.from, main.to), valid: query.valid, readOnly: view.state.readOnly, composing: panelComposing || view.state.field(compositionField), run,
      /** @param key - CM phrase key. @returns The current host translation. */
      phrase: key => view.state.phrase(key),
      /** @param changes - Requested query fields. @returns Whether this mounted panel is still current. */
      setQuery(changes) {
        if (scope.disposed) return false;
        const previous = getSearchQuery(view.state);
        const next = new SearchQuery({ search: previous.search, replace: previous.replace, caseSensitive: previous.caseSensitive,
          regexp: previous.regexp, wholeWord: previous.wholeWord, literal: previous.literal, ...(previous.test ? { test: previous.test } : {}), ...changes });
        if (!previous.eq(next)) view.dispatch({ effects: setSearchQuery.of(next) });
        return true;
      },
    };
  }
  let current = snapshot();
  const renderer = options.searchPanel ?? nativeSearchPanel(options.icons ?? defaultEditorIcon);
  const handle = renderer({ dom, props: current, host: options.componentHost, scope, requestMeasure: () => { if (!scope.disposed) view.requestMeasure(); } });
  scope.own(() => handle.destroy());
  dom.addEventListener("compositionstart", () => { if (scope.disposed) return; panelComposing = true; current = snapshot(); handle.update(current); });
  dom.addEventListener("compositionend", () => { if (scope.disposed) return; panelComposing = false; current = snapshot(); handle.update(current); });
  dom.addEventListener("keydown", event => {
    if (scope.disposed || event.defaultPrevented || panelComposing || event.isComposing || event.keyCode === 229) return;
    if (runScopeHandlers(view, event, "search-panel")) { event.preventDefault(); return; }
    const target = event.target as HTMLElement;
    // Input Enter navigates the query; buttons retain their native activation behavior.
    if (event.key === "Enter" && target.matches("input[name=search], input[name=replace], input[main-field], textarea[main-field]")) {
      event.preventDefault();
      run(target.getAttribute("name") === "replace" ? "replace" : event.shiftKey ? "previous" : "next");
    }
  });
  return { dom, top: true,
    /** Waits for the host portal to attach its input before restoring panel focus. */
    mount() { queueMicrotask(() => { if (scope.disposed) return; const input = dom.querySelector<HTMLInputElement>("[main-field]"); input?.focus(); input?.select(); view.requestMeasure(); }); },
    /** Refreshes only the small metadata consumed by the panel. */
    update() {
      const next = snapshot();
      if (JSON.stringify(current.query) === JSON.stringify(next.query) && JSON.stringify(current.matches) === JSON.stringify(next.matches)
        && current.readOnly === next.readOnly && current.composing === next.composing) return;
      current = next; handle.update(next);
    },
    /** Retires host controls and all callbacks with the CM panel lifetime. */
    destroy() { scope.dispose(); },
  };
}
