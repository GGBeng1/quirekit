import type { Command as PMCommand } from "@quirekit/pm";
import { createChainableState } from "../helpers";
import type { CommandProps } from "../types";

/**
 * Runs a ProseMirror command against the current QuireKit command context.
 *
 * @param context - Current command execution context.
 * @param command - ProseMirror command to run.
 * @returns Whether the ProseMirror command handled the request.
 */
export function runProseMirrorCommand(
  context: CommandProps,
  command: PMCommand
): boolean {
  const state = createChainableState({
    state: context.state,
    transaction: context.tr
  });

  return command(state, context.dispatch, context.editor.view as never);
}
