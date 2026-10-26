import { joinTextblockForward as pmJoinTextblockForward } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Joins the current textblock with the next textblock.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined the next textblock.
 */
export const joinTextblockForward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinTextblockForward);
