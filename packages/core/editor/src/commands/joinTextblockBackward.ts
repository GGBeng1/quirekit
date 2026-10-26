import { joinTextblockBackward as pmJoinTextblockBackward } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Joins the current textblock with the previous textblock.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror joined the previous textblock.
 */
export const joinTextblockBackward: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmJoinTextblockBackward);
