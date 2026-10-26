import type {
  QuireDisplayCommand,
  QuirePathCommand
} from "../core/display-list";
import type { QuireViewTarget } from "./events";
import type { QuireCompiledViewNode } from "./types";
import {
  translateQuireAffineTransform,
  translateQuireHitArea
} from "../core/geometry";
import { translatePoint, translateRect } from "./translate-geometry";

/**
 * Translates compiled output by a delta.
 *
 * @param compiled - Compiled output to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated compiled output.
 */
export function translateCompiledViewNode(
  compiled: QuireCompiledViewNode,
  dx: number,
  dy: number
): QuireCompiledViewNode {
  if (dx === 0 && dy === 0) {
    return compiled;
  }

  return {
    rect: translateRect(compiled.rect, dx, dy),
    commands: compiled.commands.map((command) =>
      translateQuireDisplayCommand(command, dx, dy)
    ),
    domOverlays: compiled.domOverlays.map((overlay) => ({
      ...overlay,
      rect: translateRect(overlay.rect, dx, dy)
    })),
    targets: (compiled.targets ?? []).map((target) => translateViewTarget(target, dx, dy))
  };
}

/**
 * Translates one view target by a delta.
 *
 * @param target - Target to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated target.
 */
function translateViewTarget(
  target: QuireViewTarget,
  dx: number,
  dy: number
): QuireViewTarget {
  return {
    ...target,
    rect: translateRect(target.rect, dx, dy),
    ...(target.hitArea === undefined
      ? {}
      : { hitArea: translateQuireHitArea(target.hitArea, dx, dy) })
  };
}

/**
 * Translates a display command by a delta.
 *
 * @param command - Display command to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated display command.
 */
export function translateQuireDisplayCommand(
  command: QuireDisplayCommand,
  dx: number,
  dy: number
): QuireDisplayCommand {
  if (dx === 0 && dy === 0) {
    return command;
  }

  switch (command.kind) {
    case "fill-rect":
    case "caret":
    case "image":
      return { ...command, rect: translateRect(command.rect, dx, dy) };
    case "text":
    case "glyph-run":
      return {
        ...command,
        rect: translateRect(command.rect, dx, dy),
        origin: translatePoint(command.origin, dx, dy)
      };
    case "line":
      return {
        ...command,
        from: translatePoint(command.from, dx, dy),
        to: translatePoint(command.to, dx, dy)
      };
    case "path":
      return {
        ...command,
        rect: translateRect(command.rect, dx, dy),
        segments: command.segments.map((segment) => translatePathSegment(segment, dx, dy))
      };
    case "clip":
      return {
        ...command,
        rect: translateRect(command.rect, dx, dy),
        ...(command.transform === undefined
          ? {}
          : {
              transform: translateQuireAffineTransform(
                command.transform,
                dx,
                dy
              )
            }),
        ...(command.visualBounds === undefined
          ? {}
          : { visualBounds: translateRect(command.visualBounds, dx, dy) }),
        commands: command.commands.map((child) =>
          translateQuireDisplayCommand(child, dx, dy)
        )
      };
  }
}

/**
 * Translates one path segment.
 *
 * @param segment - Path segment to translate.
 * @param dx - Horizontal delta.
 * @param dy - Vertical delta.
 * @returns Translated path segment.
 */
function translatePathSegment(
  segment: QuirePathCommand["segments"][number],
  dx: number,
  dy: number
): QuirePathCommand["segments"][number] {
  switch (segment.kind) {
    case "move-to":
    case "line-to":
      return { ...segment, point: translatePoint(segment.point, dx, dy) };
    case "quadratic-curve-to":
      return {
        ...segment,
        control: translatePoint(segment.control, dx, dy),
        point: translatePoint(segment.point, dx, dy)
      };
    case "bezier-curve-to":
      return {
        ...segment,
        control1: translatePoint(segment.control1, dx, dy),
        control2: translatePoint(segment.control2, dx, dy),
        point: translatePoint(segment.point, dx, dy)
      };
    case "close-path":
      return segment;
  }
}
