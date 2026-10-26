import { selectTextblockEnd as pmSelectTextblockEnd } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Moves the selection to the end of the active textblock.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror moved the selection.
 */
export const selectTextblockEnd: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmSelectTextblockEnd);
