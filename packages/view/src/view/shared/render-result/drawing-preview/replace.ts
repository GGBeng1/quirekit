import type { QuireDisplayCommand } from "@quirekit/renderer";

/**
 * Replaces exact command ids at the first previous family slot.
 *
 * @param previousCommands - Current commands in one paint authority.
 * @param replacementCommands - Accepted or preview drawing commands.
 * @param replacedCommandIds - Exact family ids to remove.
 * @returns Commands preserving all unrelated paint order.
 */
export function replaceMountedDrawingPreviewCommands(
  previousCommands: readonly QuireDisplayCommand[],
  replacementCommands: readonly QuireDisplayCommand[],
  replacedCommandIds: ReadonlySet<string>
): readonly QuireDisplayCommand[] {
  const firstReplacementIndex = previousCommands.findIndex((command) =>
    replacedCommandIds.has(command.id)
  );
  const persistentCommands = previousCommands.filter((command) =>
    !replacedCommandIds.has(command.id)
  );
  const insertionIndex = firstReplacementIndex < 0
    ? persistentCommands.length
    : previousCommands
      .slice(0, firstReplacementIndex)
      .filter((command) => !replacedCommandIds.has(command.id))
      .length;
  return [
    ...persistentCommands.slice(0, insertionIndex),
    ...replacementCommands,
    ...persistentCommands.slice(insertionIndex)
  ];
}
