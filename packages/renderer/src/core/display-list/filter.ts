import type { QuireRect } from "../geometry";
import { doQuireRectsIntersect } from "../geometry";
import { readQuireDisplayCommandPaintBounds } from "./paint-bounds";
import type { QuireDisplayCommand, QuireDisplayList } from "@quirekit/render-contract";

/**
 * Filters a display list to commands whose paint bounds intersect a viewport.
 *
 * @param displayList - Display list to filter.
 * @param viewportRect - Viewport rectangle in the display list's coordinate space.
 * @returns Display list containing only commands that may paint inside the viewport.
 */
export function filterQuireDisplayListToRect(
  displayList: QuireDisplayList,
  viewportRect: QuireRect
): QuireDisplayList {
  return {
    ...displayList,
    commands: filterQuireDisplayCommandsToRect(displayList.commands, viewportRect)
  };
}

/**
 * Filters display commands to commands whose paint bounds intersect a viewport.
 *
 * @param commands - Display commands to filter.
 * @param viewportRect - Viewport rectangle in the commands' coordinate space.
 * @returns Commands that may paint inside the viewport.
 */
function filterQuireDisplayCommandsToRect(
  commands: readonly QuireDisplayCommand[],
  viewportRect: QuireRect
): readonly QuireDisplayCommand[] {
  const filtered: QuireDisplayCommand[] = [];

  for (const command of commands) {
    const paintBounds = readQuireDisplayCommandPaintBounds(command);
    if (
      paintBounds !== null
      && !doQuireRectsIntersect(paintBounds, viewportRect)
    ) {
      continue;
    }

    if (command.kind !== "clip" || command.transform !== undefined) {
      filtered.push(command);
      continue;
    }

    const clippedCommands = filterQuireDisplayCommandsToRect(command.commands, viewportRect);

    if (clippedCommands.length > 0) {
      filtered.push({ ...command, commands: clippedCommands });
    }
  }

  return filtered;
}
