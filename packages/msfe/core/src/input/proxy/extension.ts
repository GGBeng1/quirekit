import { EditorState, Prec, type Extension } from "@quirekit/cm-state";
import { EditorView, ViewPlugin } from "@quirekit/cm-view";
import { SourceInputRuntime } from "./runtime";
import { sourceProxyState } from "./state";
import type { SourceInputProxyOptions } from "./types";
import { sourceInputHasFocus } from "./focus";

/**
 * Installs one optional isolated keyboard owner while preserving canonical CM source and commands.
 * @param options - Media and source-mode admission policy; queries use the mounted owner window.
 * @returns CodeMirror extension, inactive outside the configured touch presentation.
 */
export function sourceInputProxy(options: SourceInputProxyOptions): Extension {
  const runtime = ViewPlugin.define(view => new SourceInputRuntime(view, options));
  return [sourceProxyState, Prec.highest(EditorView.editable.compute([sourceProxyState, EditorState.readOnly],
    state => !state.field(sourceProxyState).active && !state.readOnly)),
    Prec.highest(EditorView.contentAttributes.of(view => view.state.field(sourceProxyState).active
      ? { role: "document", tabindex: "-1" } : { role: "textbox", tabindex: "0" })),
    runtime,
    EditorView.scrollHandler.of(/** @param view - Native scroll owner. @param range - Requested source caret. @param intent - Native strategy and margins. @returns Whether the isolated input owner accepted this nearest-caret scroll. */ (view, range, intent) => {
      const owner = view.plugin(runtime);
      if (!owner?.active || !sourceInputHasFocus(view) || intent.y !== "nearest" || range.head !== view.state.selection.main.head
        || !view.visibleRanges.some(value => value.from <= range.head && range.head <= value.to)) return false;
      // Native keymaps/history retain their scroll intent, but only one owner
      // writes the viewport. Explicit navigation and mounting stay native.
      owner.revealSelection(); return true;
    }),
    EditorView.baseTheme({
      ".msfe-input-preedit": { textDecoration: "underline", textDecorationStyle: "dotted", whiteSpace: "pre-wrap" },
      "&[data-msfe-input-proxy] > .cm-scroller > .cm-content": { userSelect: "none", "-webkit-user-select": "none", "-webkit-touch-callout": "none" },
      "&[data-msfe-input-proxy] > .cm-scroller > .cm-content *:not(input):not(textarea)": { "-webkit-touch-callout": "none" },
    }),
  ];
}
