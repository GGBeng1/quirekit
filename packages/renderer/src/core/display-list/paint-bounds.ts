import { isQuireRectFinite, type QuirePoint, type QuireRect } from "../geometry";
import { resolveQuireImagePaintBounds } from "./image-transform";
import type { QuireDisplayCommand } from "@quirekit/render-contract";

/**
 * Reads the renderer-neutral approximate paint bounds for a display command.
 *
 * A null result means runtime geometry is invalid or incomplete, not that the
 * command paints nothing. Filtering and invalidation callers must apply their
 * own conservative unknown-bounds policy.
 *
 * @param command - Display command whose approximate bounds should be read.
 * @returns Finite non-negative paint bounds, or null when they are unknown.
 */
export function readQuireDisplayCommandPaintBounds(
  command: QuireDisplayCommand | null | undefined
): QuireRect | null {
  if (command === null || command === undefined) {
    return null;
  }

  switch (command.kind) {
    case "fill-rect":
    case "caret":
    case "text":
    case "glyph-run":
    case "path":
      return readFiniteRect(command.rect);
    case "clip":
      return readFiniteRect(command.visualBounds ?? command.rect);
    case "image": {
      if (readFiniteRect(command.rect) === null) {
        return null;
      }
      const transform = command.transform;
      if (
        transform !== undefined
        && (
          typeof transform !== "object"
          || transform === null
          || !Number.isFinite(transform.rotation)
        )
      ) {
        return null;
      }
      return readFiniteRect(resolveQuireImagePaintBounds(command));
    }
    case "line":
      return readQuireLinePaintBounds(
        command.from,
        command.to,
        command.lineWidth
      );
    default:
      return null;
  }
}

/**
 * Reads approximate axis-aligned bounds for a stroked line.
 *
 * @param from - Line start point.
 * @param to - Line end point.
 * @param lineWidth - Non-negative stroke width.
 * @returns Finite stroke bounds, or null for invalid runtime geometry.
 */
function readQuireLinePaintBounds(
  from: QuirePoint | null | undefined,
  to: QuirePoint | null | undefined,
  lineWidth: number
): QuireRect | null {
  if (
    from === undefined
    || from === null
    || to === undefined
    || to === null
    || !Number.isFinite(from.x)
    || !Number.isFinite(from.y)
    || !Number.isFinite(to.x)
    || !Number.isFinite(to.y)
    || !Number.isFinite(lineWidth)
    || lineWidth < 0
  ) {
    return null;
  }

  const halfWidth = lineWidth / 2;
  return {
    x: Math.min(from.x, to.x) - halfWidth,
    y: Math.min(from.y, to.y) - halfWidth,
    width: Math.abs(to.x - from.x) + lineWidth,
    height: Math.abs(to.y - from.y) + lineWidth
  };
}

/**
 * Retains a rectangle only when it satisfies the shared finite contract.
 *
 * @param rect - Candidate rectangle.
 * @returns The original rectangle, or null when invalid.
 */
function readFiniteRect(rect: QuireRect | null | undefined): QuireRect | null {
  return rect !== undefined && rect !== null && isQuireRectFinite(rect) ? rect : null;
}
