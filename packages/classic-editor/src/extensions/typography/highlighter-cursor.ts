import type { QuireEditor } from "@quirekit/core";
import { readHighlighterPenState } from "@quirekit/extension-text-style";

/** View-root attribute that switches the canvas and SVG pointer to the highlighter cursor. */
const highlighterPenAttribute = "data-qk-highlighter-pen";

/**
 * Mirrors pen mode onto the mounted view so the stylesheet can show the highlighter cursor.
 *
 * Reading plugin state is O(1); the DOM changes only when the mode flips,
 * including the implicit reset on document replacement.
 *
 * @param editor - Editor whose view root receives the attribute.
 */
export function syncClassicHighlighterPenCursor(editor: QuireEditor): void {
  const dom = editor.mountedView?.dom;
  const active = readHighlighterPenState(editor.state).active;
  if (dom !== undefined && dom.hasAttribute(highlighterPenAttribute) !== active) {
    dom.toggleAttribute(highlighterPenAttribute, active);
  }
}
