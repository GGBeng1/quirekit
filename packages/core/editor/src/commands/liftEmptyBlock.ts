import { liftEmptyBlock as pmLiftEmptyBlock } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Lifts an empty textblock when possible.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror lifted the empty block.
 */
export const liftEmptyBlock: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmLiftEmptyBlock);
