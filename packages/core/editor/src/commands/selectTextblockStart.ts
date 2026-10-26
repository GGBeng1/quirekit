import { selectTextblockStart as pmSelectTextblockStart } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Moves the selection to the start of the active textblock.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror moved the selection.
 */
export const selectTextblockStart: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmSelectTextblockStart);
