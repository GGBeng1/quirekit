import { undoInputRule as pmUndoInputRule } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Undoes the last undoable input rule transform.
 *
 * @param context - Current command execution context.
 * @returns Whether an input rule transform was undone.
 */
export const undoInputRule: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmUndoInputRule);
