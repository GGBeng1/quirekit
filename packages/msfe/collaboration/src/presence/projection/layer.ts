import { EditorSelection } from "@quirekit/cm-state";
import { EditorView, RectangleMarker, layer, type LayerMarker } from "@quirekit/cm-view";
import { caretPosition, selectionRectangles } from "./geometry";
import { PresenceMarker } from "./marker";
import { presenceState } from "./state";

/** @param view - Current native layout authority. @param selections - Range or caret layer.
 * @returns Already measured markers; no editor transaction, focus or scroll operation occurs here. */
function markers(view: EditorView, selections: boolean): readonly LayerMarker[] {
  const result: LayerMarker[] = [], viewport = view.scrollDOM.getBoundingClientRect();
  for (const peer of view.state.field(presenceState)) {
    const selected = peer.selection; if (!selected) continue;
    if (selections) {
      for (const rect of selectionRectangles(view, selected.anchor, selected.head)) {
        result.push(new PresenceMarker(view.dom.ownerDocument, peer, rect, "selection"));
      }
    } else {
      if (selected.head < view.viewport.from || selected.head > view.viewport.to) continue;
      const target = caretPosition(view, selected.head);
      if (!view.visibleRanges.some(range => target.position >= range.from && target.position <= range.to)) continue;
      const coords = view.coordsAtPos(target.position);
      const rect = RectangleMarker.forRange(view, "", EditorSelection.cursor(target.position))[0];
      if (!rect || rect.height <= 0 || !coords) continue;
      result.push(new PresenceMarker(view.dom.ownerDocument, peer, rect, target.boundary ? "boundary" : "caret", coords.left + 150 > viewport.right));
    }
  }
  return result;
}

/** Passive optional layers. CM owns geometry invalidation, read/write phases, viewport clipping and CSS scaling. */
// Both layers paint above the text: block surfaces such as code blocks have opaque backgrounds that would
// hide a range drawn beneath them. Ranges come first so carets and their labels stay on top.
export const presenceProjection = [presenceState, ...[true, false].map(selections => layer({
  above: true, class: selections ? "msfe-presence-ranges" : "msfe-presence-cursors",
  update: update => update.startState.field(presenceState) !== update.state.field(presenceState),
  markers: view => markers(view, selections),
})), EditorView.baseTheme({
  ".msfe-presence-cursors, .msfe-presence-ranges": { pointerEvents: "none" },
  ".msfe-presence-caret": { borderLeft: "2px solid var(--msfe-peer-color)", boxSizing: "border-box" },
  '.msfe-presence-caret[data-presence-kind="boundary"]': { borderLeftStyle: "dashed" },
  ".msfe-presence-label": { position: "absolute", bottom: "100%", left: "-2px", backgroundColor: "var(--msfe-peer-color)",
    color: "#fff", fontFamily: "var(--qk-font-sans, sans-serif)", fontSize: "11px", lineHeight: "16px", fontWeight: "500",
    padding: "0 5px", borderRadius: "3px 3px 3px 0", whiteSpace: "nowrap", maxWidth: "145px", overflow: "hidden", textOverflow: "ellipsis" },
})];
