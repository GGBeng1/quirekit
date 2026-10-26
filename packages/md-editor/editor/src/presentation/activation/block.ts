import { layer, RectangleMarker, type EditorView } from "@quirekit/cm-view";
import { readSourcePresentation, sourceInputHasFocus, sourceInputFocusChanged } from "@quirekit/msfe-core";

/**
 * Finds the containing public document block without enumerating sibling blocks.
 * @param content - Canonical editable content root.
 * @param node - Native DOM position for the accepted caret.
 * @returns The block directly inside the document or nearest container body.
 */
export function activeProseBlock(content: HTMLElement, node: Node): HTMLElement | null {
  let block = node.nodeType === 1 ? node as HTMLElement : node.parentElement;
  if (!block || block === content || !content.contains(block)) return null;
  while (block.parentElement && block.parentElement !== content
    && !block.parentElement.classList.contains("qk-prose-container__body")) block = block.parentElement;
  return block.classList.contains("md-separator-line") ? null : block;
}

/** @param view - Mounted canonical editor. @returns At most one passive marker in the native layer coordinate system. */
function markers(view: EditorView): readonly RectangleMarker[] {
  const { mode, selection } = readSourcePresentation(view.state);
  const range = selection.main;
  if (!sourceInputHasFocus(view) || mode !== "live" || view.state.readOnly || !range.empty
    || !view.visibleRanges.some(visible => range.head >= visible.from && range.head <= visible.to)) return [];
  const side = range.assoc || 1;
  const block = activeProseBlock(view.contentDOM, view.domAtPos(range.head, side).node);
  if (!block) return [];

  // Geometry is read only in CM's scheduled measure phase. Its own caret marker
  // supplies the layer origin (including scroll/scale/RTL), so this overlay never
  // participates in source layout, DOM selection, or pointer hit testing.
  const anchor = RectangleMarker.forRange(view, "", range)[0], caret = view.coordsAtPos(range.head, side);
  if (!anchor || !caret) return [];
  const rect = block.getBoundingClientRect();
  if (rect.height <= 0) return [];
  return [new RectangleMarker("md-active-block", anchor.left + rect.left - caret.left,
    anchor.top + rect.top - caret.top, rect.width, rect.height)];
}

/** One shared passive block boundary for every Prose block, including extension wrappers. */
export const proseActiveBlock = layer({
  // A translucent foreground layer also remains visible inside colored Prose
  // containers and code blocks, whose own backgrounds cover a negative layer.
  above: true,
  class: "md-active-block-layer",
  markers,
  /** @param update - Accepted source, selection and focus dependencies. @returns Whether the bounded marker measurement may have changed. */
  update(update) {
    const before = readSourcePresentation(update.startState), after = readSourcePresentation(update.state);
    return update.docChanged || sourceInputFocusChanged(update) || before.selection !== after.selection
      || before.mode !== after.mode || update.startState.readOnly !== update.state.readOnly;
  },
});
