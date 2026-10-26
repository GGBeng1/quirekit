import { newlineInCode as pmNewlineInCode } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Inserts a newline inside a code block.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror inserted a code newline.
 */
export const newlineInCode: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmNewlineInCode);
