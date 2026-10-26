import { joinBackward as pmJoinBackward } from "@quirekit/pm";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Applies ProseMirror's backward join behavior.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined backward.
 */
export const joinBackward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinBackward);
