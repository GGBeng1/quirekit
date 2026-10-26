import { joinForward as pmJoinForward } from "@quirekit/pm";
import { runProseMirrorCommand } from "./pm-command";
import type { CommandSpec } from "../types";

/**
 * Applies ProseMirror's forward join behavior.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined forward.
 */
export const joinForward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinForward);
