import {
  intersectQuireRects,
  readQuireDisplayCommandPaintBounds,
  type QuireDisplayCommand,
  type QuireDisplayList,
  type QuireRect
} from "@quirekit/renderer";

/**
 * Reads the clipped paint bounds for a retained display-list chunk.
 *
 * @param displayList - Retained display list to inspect.
 * @param viewportRect - Retained record rectangle that clips paint bounds.
 * @returns Union of visible command paint bounds, or null when no command paints.
 */
export function readQuireDisplayChunkDisplayListDirtyBounds(
  displayList: QuireDisplayList,
  viewportRect: QuireRect
): QuireRect | null {
  let bounds: QuireRect | null = null;

  for (const command of displayList.commands) {
    const commandBounds = readQuireDisplayChunkDisplayCommandDirtyBounds(
      command,
      viewportRect
    );
    if (commandBounds !== null) {
      bounds = expandQuireDisplayChunkRectUnion(bounds, commandBounds);
    }
  }

  return bounds;
}

/**
 * Reads a command's visible paint bounds after retained-record and clip clipping.
 *
 * @param command - Display command to inspect.
 * @param viewportRect - Retained record or nested clip rectangle that limits visibility.
 * @returns Visible dirty bounds, or null when no paint intersects the viewport.
 */
export function readQuireDisplayChunkDisplayCommandDirtyBounds(
  command: QuireDisplayCommand,
  viewportRect: QuireRect
): QuireRect | null {
  const commandRect = readQuireDisplayCommandPaintBounds(command);
  if (commandRect === null) {
    return viewportRect;
  }

  const clippedRect = intersectQuireRects(commandRect, viewportRect);
  if (clippedRect === null) {
    return null;
  }
  if (command.kind !== "clip" || command.transform !== undefined) {
    return clippedRect;
  }

  let bounds: QuireRect | null = null;
  for (const child of command.commands) {
    const childBounds = readQuireDisplayChunkDisplayCommandDirtyBounds(
      child,
      clippedRect
    );
    if (childBounds !== null) {
      bounds = expandQuireDisplayChunkRectUnion(bounds, childBounds);
    }
  }
  return bounds;
}

/**
 * Expands a nullable rectangle union with one visible rectangle.
 *
 * @param current - Current union, or null when no rectangle is present.
 * @param rect - Rectangle to include.
 * @returns Expanded rectangle union.
 */
export function expandQuireDisplayChunkRectUnion(
  current: QuireRect | null,
  rect: QuireRect
): QuireRect {
  if (current === null) {
    return rect;
  }

  const x = Math.min(current.x, rect.x);
  const y = Math.min(current.y, rect.y);
  const right = Math.max(current.x + current.width, rect.x + rect.width);
  const bottom = Math.max(current.y + current.height, rect.y + rect.height);
  return { x, y, width: right - x, height: bottom - y };
}
