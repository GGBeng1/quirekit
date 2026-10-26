import { joinUp as pmJoinUp } from "@quirekit/pm";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Joins the selected block with the sibling above it.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined upward.
 */
export const joinUp: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinUp);
