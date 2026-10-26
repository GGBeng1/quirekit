import type { CommandProps, QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";

/**
 * Applies a percentage or restores inheritance through the editor's protection filters.
 *
 * @param editor - Active editor.
 * @param value - Integer percentage or null.
 * @param dryRun - Admission-only invocation.
 *
 * @returns Whether the complete edit is accepted.
 */
export function applyTextScale(editor: QuireEditor, value: number | null, dryRun = false): boolean {
  if (!editor.isEditable || typeof editor.commands.setTextScale !== "function") return false;
  const chain = (dryRun ? editor.can().chain() : editor.chain()).command(
    /**
     * Starts an independent undo boundary for this panel edit.
     * @param props - Root transaction.
     * @returns Whether the chain may continue.
     */
    (props: CommandProps) => { closeHistory(props.tr); return true; }
  );
  const edit = value === null ? chain.unsetTextScale() : chain.setTextScale(value);
  return edit.command(
    /**
     * Validates the complete edit against the document's edit policies.
     * @param props - Candidate transaction.
     * @returns Whether all edit policies permit it.
     */
    (props: CommandProps) => {
      const allowed = editor.state.pm.filterTransaction(props.tr);
      if (!allowed) props.tr.setMeta("preventDispatch", true);
      return allowed;
    }
  ).run();
}
