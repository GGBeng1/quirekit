import type { CommandProps, QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";

/**
 * Applies a single nullable character-grid attribute through native mark/history semantics.
 * @param editor - Editor holding the current selection and edit policies.
 * @param value - Explicit participation, or null to restore style inheritance.
 * @param dryRun - Whether to probe without dispatching.
 * @returns Whether the entire edit is admissible.
 */
export function applyCharacterGrid(editor: QuireEditor, value: boolean | null, dryRun = false): boolean {
  if (!editor.isEditable || !editor.schema.marks.textStyle?.spec.attrs?.characterGrid
    || value !== null && typeof value !== "boolean") return false;
  return (dryRun ? editor.can().chain() : editor.chain()).command(
    /** @param props - Shared format transaction. @returns An independent undo boundary. */
    (props: CommandProps) => { closeHistory(props.tr); return true; }
  ).setMark("textStyle", { characterGrid: value }).removeEmptyTextStyle().command(
    /** @param props - Complete candidate edit. @returns Whether every protection filter accepts it. */
    (props: CommandProps) => {
      const allowed = editor.state.pm.filterTransaction(props.tr);
      if (!allowed) props.tr.setMeta("preventDispatch", true);
      return allowed;
    }
  ).run();
}
