import type { QuireDisplayCommand } from "@quirekit/renderer";

/**
 * Reports whether a command belongs to the transient selection/caret overlay.
 *
 * @param command - Display-list command to inspect.
 * @returns Whether the command can be rebuilt without repainting persistent content.
 */
export function isMountedSelectionOverlayCommand(
  command: QuireDisplayCommand
): boolean {
  return command.kind === "caret"
    || (command.kind === "fill-rect"
      && typeof command.id === "string"
      && command.id.startsWith("selection-range-"));
}

/**
 * Replaces transient selection commands while retaining other overlay contributions.
 *
 * The new commands occupy the first previous selection slot. When the previous
 * overlay had no Canvas/SVG selection command, they are inserted first so retained
 * editor-layer labels and controls continue to paint above the selection wash.
 *
 * @param previousCommands - Commands from the retained overlay display list.
 * @param transientCommands - Newly resolved selection, activation, and caret commands.
 * @param replacedCommandIds - Runtime-activated command ids replaced in this pass.
 * @returns Overlay commands with persistent contributions preserved in order.
 */
export function replaceMountedSelectionOverlayCommands(
  previousCommands: readonly QuireDisplayCommand[],
  transientCommands: readonly QuireDisplayCommand[],
  replacedCommandIds: ReadonlySet<string> = new Set()
): readonly QuireDisplayCommand[] {
  /**
   * Reports whether one previous command belongs to this transient projection.
   *
   * @param command - Previous overlay command to inspect.
   * @returns Whether the command must be removed before insertion.
   */
  function shouldReplace(command: QuireDisplayCommand): boolean {
    return isMountedSelectionOverlayCommand(command)
      || (typeof command.id === "string" && replacedCommandIds.has(command.id));
  }
  const firstTransientIndex = previousCommands.findIndex(
    shouldReplace
  );
  const persistentCommands = previousCommands.filter(
    (command) => !shouldReplace(command)
  );
  const insertionIndex = firstTransientIndex < 0
    ? 0
    : previousCommands
      .slice(0, firstTransientIndex)
      .filter((command) => !shouldReplace(command))
      .length;

  return [
    ...persistentCommands.slice(0, insertionIndex),
    ...transientCommands,
    ...persistentCommands.slice(insertionIndex)
  ];
}
