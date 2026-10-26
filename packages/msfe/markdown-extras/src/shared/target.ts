import { EditorSelection } from "@quirekit/cm-state";
import { readSourcePresentation, type MsfeEditor, type MsfeSourceRange } from "@quirekit/msfe-core";
import type { PreviewTarget, PreviewOptions, PreviewProps } from "./types";

/** @param editor - Canonical owner. @param range - Current confirmed source interval.
 * @param edit - Optional product editor callback. @param kind - Renderer family.
 * @returns A mapped intent that rejects removal, source replacement and changed bodies. */
export function previewTarget(editor: MsfeEditor, range: MsfeSourceRange, edit?: PreviewOptions["edit"], kind: PreviewProps["kind"] = "displayMath"): PreviewTarget {
  const anchor = editor.captureAnchor(range);
  return { reveal() {
    const target = anchor.target();
    if (!target || editor.mode !== "live" || editor.state.readOnly || readSourcePresentation(editor.state).composing) return false;
    if (edit) return edit({ editor, range: { from: target.selection.main.from, to: target.selection.main.to }, kind });
    editor.setSelection(EditorSelection.single(target.selection.main.from)); editor.focus();
    return true;
  }, release: () => anchor.release() };
}
