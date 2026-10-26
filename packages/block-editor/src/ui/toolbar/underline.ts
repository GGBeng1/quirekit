import type { Editor } from "@quirekit/core";
import type { EditorState } from "@quirekit/pm";
import type { UnderlineAttributes, UnderlineStyle } from "@quirekit/extension-underline";

/** Distinct line styles supported by the HTML projection; imported native values remain intact. */
export const blockUnderlineStyles = ["none", "single", "double", "thick", "dotted", "dottedHeavy", "dash", "dashedHeavy", "wave", "wavyHeavy"] as const satisfies readonly UnderlineStyle[];

/**
 * Applies one underline field without retargeting an open popup to a later selection.
 * @param editor - Owning editor session.
 * @param source - Snapshot captured when the popup opened or after its own successful edit.
 * @param attributes - Independent native underline fields.
 * @returns Whether the original editable target accepted the command.
 */
export function applyBlockUnderline(editor: Editor, source: EditorState, attributes: UnderlineAttributes): boolean {
  const state = editor.state.pm;
  return editor.isEditable && state.doc === source.doc && state.selection.eq(source.selection)
    && state.storedMarks === source.storedMarks && !!editor.commands.setUnderline
    && editor.commands.setUnderline(attributes);
}
