import { exitCode as pmExitCode } from "@quirekit/pm";
import type { CommandSpec } from "../types";
import { runProseMirrorCommand } from "./pm-command";

/**
 * Exits a code block by creating a default block after it.
 *
 * @param context - Current command execution context.
 * @returns Whether ProseMirror exited a code block.
 */
export const exitCode: CommandSpec = () => (context) =>
  runProseMirrorCommand(context, pmExitCode);
