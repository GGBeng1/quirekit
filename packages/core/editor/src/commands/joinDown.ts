import { joinDown as pmJoinDown } from "@quirekit/pm";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Joins the selected block with the sibling below it.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined downward.
 */
export const joinDown: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinDown);
