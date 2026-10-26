import type { PathCommand } from "fontkit";
import type { QuirePathSegment } from "@quirekit/renderer";

/**
 * Converts fontkit path commands into renderer path segments.
 *
 * @param commands - Fontkit path commands in font units.
 * @param scale - Font-unit to CSS-pixel scale.
 * @param flipY - Whether to invert y coordinates for Canvas baselines.
 * @returns Renderer path segments in glyph-local CSS pixels.
 */
export function convertFontKitPathCommands(
  commands: readonly PathCommand[],
  scale: number,
  flipY: boolean
): readonly QuirePathSegment[] {
  const segments: QuirePathSegment[] = [];

  for (const command of commands) {
    const segment = convertFontKitPathCommand(command, scale, flipY);

    if (segment !== null) {
      segments.push(segment);
    }
  }

  return segments;
}

/**
 * Converts one fontkit path command into a renderer path segment.
 *
 * @param command - Fontkit path command in font units.
 * @param scale - Font-unit to CSS-pixel scale.
 * @param flipY - Whether to invert y coordinates for Canvas baselines.
 * @returns Renderer path segment, or null when the command is malformed.
 */
function convertFontKitPathCommand(
  command: PathCommand,
  scale: number,
  flipY: boolean
): QuirePathSegment | null {
  switch (command.command) {
    case "moveTo": {
      const point = readPathPoint(command.args, 0, scale, flipY);

      return point === null ? null : { kind: "move-to", point };
    }
    case "lineTo": {
      const point = readPathPoint(command.args, 0, scale, flipY);

      return point === null ? null : { kind: "line-to", point };
    }
    case "quadraticCurveTo": {
      const control = readPathPoint(command.args, 0, scale, flipY);
      const point = readPathPoint(command.args, 2, scale, flipY);

      return control === null || point === null
        ? null
        : { kind: "quadratic-curve-to", control, point };
    }
    case "bezierCurveTo": {
      const control1 = readPathPoint(command.args, 0, scale, flipY);
      const control2 = readPathPoint(command.args, 2, scale, flipY);
      const point = readPathPoint(command.args, 4, scale, flipY);

      return control1 === null || control2 === null || point === null
        ? null
        : { kind: "bezier-curve-to", control1, control2, point };
    }
    case "closePath":
      return { kind: "close-path" };
  }
}

/**
 * Reads and converts one point from a fontkit command argument list.
 *
 * @param args - Fontkit command arguments.
 * @param offset - Argument offset where the x/y pair starts.
 * @param scale - Font-unit to CSS-pixel scale.
 * @param flipY - Whether to invert y coordinates for Canvas baselines.
 * @returns Converted point, or null when the pair is missing.
 */
function readPathPoint(
  args: readonly number[],
  offset: number,
  scale: number,
  flipY: boolean
): { readonly x: number; readonly y: number } | null {
  const x = args[offset];
  const y = args[offset + 1];

  return x === undefined || y === undefined
    ? null
    : toPathPoint(x, y, scale, flipY);
}

/**
 * Converts one font-unit point into glyph-local CSS pixels.
 *
 * @param x - Font-unit x coordinate.
 * @param y - Font-unit y coordinate.
 * @param scale - Font-unit to CSS-pixel scale.
 * @param flipY - Whether to invert y coordinates for Canvas baselines.
 * @returns Renderer point in glyph-local CSS pixels.
 */
function toPathPoint(
  x: number,
  y: number,
  scale: number,
  flipY: boolean
): { readonly x: number; readonly y: number } {
  return {
    x: x * scale,
    y: (flipY ? -y : y) * scale
  };
}
