import type { CommandProps, SingleCommands } from "@quirekit/core";
import type { ClassicEditorRenderContext } from "../../types";

/**
 * Runs an existing feature command against an optional captured block boundary.
 * @param context - Ephemeral insertion context, or the ordinary feature context.
 * @param command - Synchronous canonical command and the state at its prepared destination.
 * @param check - Simulates the same prepared paragraph without dispatching.
 * @returns Whether the complete insertion is admitted and handled.
 */
export function runClassicEditorInsertion(
  context: ClassicEditorRenderContext,
  command: (commands: SingleCommands, state: CommandProps["state"]) => boolean,
  check = false
): boolean {
  if (!context.editor.isEditable) return false;
  const commands = check ? context.editor.can() : context.editor.commands;
  if (!context.blockInsertion) return command(commands, context.editor.state.pm);
  return typeof commands.insertBlockAt === "function" && commands.insertBlockAt({
    ...context.blockInsertion,
    initialize: ({ commands: initialized, state }) => command(initialized, state)
  });
}
