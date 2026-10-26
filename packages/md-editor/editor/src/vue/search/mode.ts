import { Prec, type Extension } from "@quirekit/cm-state";
import { keymap, type EditorView } from "@quirekit/cm-view";
import { openSearchPanel, searchPanelOpen } from "@quirekit/cm-search";

/** Find shows the query only; replace adds the replacement field and actions. */
export type MdSearchMode = "find" | "replace";

/** DOM event asking an open search panel to switch mode. */
export const MD_SEARCH_MODE_EVENT = "md-search-mode";

/** Mode requested before the panel mounts, keyed by the editor root. */
const requested = new WeakMap<Element, MdSearchMode>();

/**
 * @param host - Element inside the editor that hosts the panel.
 * @returns The mode requested for the panel being opened, consumed once.
 */
export function takeRequestedSearchMode(host: Element): MdSearchMode | null {
  const editor = host.closest(".cm-editor");
  const mode = editor ? requested.get(editor) ?? null : null;
  if (editor) requested.delete(editor);
  return mode;
}

/**
 * @param mode - Panel mode to show.
 * @returns Command opening the panel in that mode, or switching an open panel.
 */
function openIn(mode: MdSearchMode): (view: EditorView) => boolean {
  return view => {
    if (mode === "replace" && view.state.readOnly) return false;
    if (searchPanelOpen(view.state)) {
      view.dom.querySelector(".msfe-search-panel")?.dispatchEvent(new CustomEvent(MD_SEARCH_MODE_EVENT, { detail: mode }));
      if (mode === "replace") return true;
    } else requested.set(view.dom, mode);
    return openSearchPanel(view);
  };
}

/** Classic's shortcuts: Mod-F finds, Ctrl-H (and Cmd-Shift-H on macOS) replaces; above editor defaults such as macOS Ctrl-H. */
export const mdSearchKeymap: Extension = Prec.high(keymap.of([
  { key: "Mod-f", run: openIn("find"), scope: "editor search-panel" },
  { key: "Ctrl-h", run: openIn("replace"), scope: "editor search-panel" },
  { mac: "Mod-Shift-h", run: openIn("replace"), scope: "editor search-panel" },
]));
