import type { QuireEditor } from "@quirekit/core";

/**
 * Moves the caret into the content a feedback row refers to and scrolls it
 * into view. The position was resolved when the report was produced, so it is
 * clamped in case the document changed since.
 *
 * @param editor - Mounted editor, or undefined before mount.
 * @param position - Position before the affected node.
 */
export function locateDocumentServiceFeedbackItem(
  editor: QuireEditor | undefined,
  position: number
): void {
  if (editor === undefined) return;
  const target = Math.max(0, Math.min(position + 1, editor.state.doc.content.size));
  editor.commands.focus(target, { scrollIntoView: false });
  editor.view.scrollRangeIntoView({ from: target, to: target }, { block: "center", margin: 24 });
}
