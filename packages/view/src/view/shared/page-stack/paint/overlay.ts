import type {
  QuireDisplayCommand,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";

/**
 * Applies page-surface bounds and the current caret visibility to an overlay list.
 *
 * @param displayList - Page-scoped overlay display list.
 * @param bounds - Bounds used to clear or synchronize the target surface.
 * @param caretVisible - Whether caret commands should remain in the result.
 * @returns Overlay display list for the requested transient caret phase.
 */
export function createMountedPageOverlayDisplayList(
  displayList: QuireDisplayList,
  bounds: QuireRect,
  caretVisible: boolean
): QuireDisplayList {
  return {
    ...displayList,
    bounds,
    commands: caretVisible
      ? displayList.commands
      : omitMountedPageOverlayCaretCommands(displayList.commands)
  };
}

/**
 * Removes caret commands recursively while preserving every other paint command.
 *
 * @param commands - Overlay commands to project for a hidden caret phase.
 * @returns Commands without top-level or clipped caret entries.
 */
function omitMountedPageOverlayCaretCommands(
  commands: readonly QuireDisplayCommand[]
): readonly QuireDisplayCommand[] {
  return commands
    .filter((command) => command.kind !== "caret")
    .map((command) => command.kind === "clip"
      ? {
          ...command,
          commands: omitMountedPageOverlayCaretCommands(command.commands)
        }
      : command);
}
