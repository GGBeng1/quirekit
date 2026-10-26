import type { CommandProps, QuireEditor } from "@quirekit/core";
import { closeHistory } from "@quirekit/pm";

/**
 * Applies one explicit hidden/unhidden value through the existing typed command.
 * @param editor - Latest editor and permission state.
 * @param hidden - Explicit override; false must not restore inherited hiding.
 * @param dryRun - Whether to validate the full edit without dispatch.
 * @returns Whether the edit is admitted by every installed transaction filter.
 */
export function applyHiddenText(editor: QuireEditor, hidden: boolean, dryRun = false): boolean {
  if (!editor.isEditable || typeof editor.commands.setHiddenText !== "function") return false;
  return (dryRun ? editor.can().chain() : editor.chain()).command(
    /** @param props - Shared transaction. @returns Independent undo boundary accepted. */
    (props: CommandProps) => { closeHistory(props.tr); return true; }
  ).setHiddenText(hidden).command(
    /** @param props - Complete candidate transaction. @returns Whether the full edit is allowed. */
    (props: CommandProps) => {
      const allowed = editor.state.pm.filterTransaction(props.tr);
      if (!allowed) props.tr.setMeta("preventDispatch", true);
      return allowed;
    }
  ).run();
}
