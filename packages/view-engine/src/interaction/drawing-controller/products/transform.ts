import {
  createQuireCenterRotationTransform,
  createQuireTransformedRectHitArea,
  resolveQuirePointBounds,
  transformQuireHitArea,
  transformQuirePoint,
  type QuireAffineTransform,
  type QuireDisplayCommand,
  type QuirePathCommand,
  type QuireRect,
  type QuireViewTarget
} from "@quirekit/renderer";
import type {
  QuireDrawingSelectionProductTransformOptions,
  QuireDrawingSelectionProductTransformResult
} from "./types";

/**
 * Rotates selected-object paint and targets around the accepted frame center.
 *
 * The axis-aligned target rectangle remains a coarse spatial-index fact. Every
 * transformed target also retains its exact polygon for final hit testing.
 *
 * @param options - Compiled selected artifacts and their owning frame.
 * @returns Original artifacts for identity rotation, otherwise transformed products.
 */
export function transformQuireDrawingSelectionProducts(
  options: QuireDrawingSelectionProductTransformOptions
): QuireDrawingSelectionProductTransformResult {
  if (options.frame.rotation % 360 === 0) {
    return {
      commands: options.commands,
      targets: options.targets
    };
  }

  const transform = createQuireCenterRotationTransform(
    options.frame.rect,
    options.frame.rotation
  );
  return {
    commands: options.commands.map((command) =>
      transformSelectionCommand(command, transform)
    ),
    targets: options.targets.map((target) =>
      transformSelectionTarget(target, transform)
    )
  };
}

/**
 * Applies the selection transform to one supported display command.
 *
 * @param command - Selected chrome command.
 * @param transform - Center-fixed frame transform.
 * @returns Transformed selected chrome command.
 */
function transformSelectionCommand(
  command: QuireDisplayCommand,
  transform: QuireAffineTransform
): QuireDisplayCommand {
  switch (command.kind) {
    case "path":
      return {
        ...command,
        rect: resolveTransformedRectBounds(command.rect, transform),
        segments: command.segments.map((segment) =>
          transformSelectionPathSegment(segment, transform)
        )
      };
    case "line":
      return {
        ...command,
        from: transformQuirePoint(command.from, transform),
        to: transformQuirePoint(command.to, transform)
      };
    case "fill-rect":
    case "caret":
      return transformSelectionRectCommand(command, transform);
    case "clip":
      return {
        ...command,
        rect: resolveTransformedRectBounds(command.rect, transform),
        commands: command.commands.map((child) =>
          transformSelectionCommand(child, transform)
        )
      };
    case "image":
    case "text":
    case "glyph-run":
      throw new RangeError(
        `Selected drawing transform does not admit "${command.kind}" commands.`
      );
  }
}

/**
 * Converts a rotated rectangle command into an exact polygon path.
 *
 * @param command - Filled rectangle or caret command.
 * @param transform - Center-fixed frame transform.
 * @returns Filled polygon command.
 */
function transformSelectionRectCommand(
  command: Extract<QuireDisplayCommand, { readonly kind: "fill-rect" | "caret" }>,
  transform: QuireAffineTransform
): QuirePathCommand {
  const hitArea = createQuireTransformedRectHitArea(command.rect, transform);
  const [first, ...rest] = hitArea.points;
  if (first === undefined) {
    throw new RangeError("Selection rectangle transform requires four corners.");
  }
  const { kind: _kind, rect: _rect, ...base } = command;
  return {
    ...base,
    kind: "path",
    rect: resolveQuirePointBounds(hitArea.points),
    segments: [
      { kind: "move-to", point: first },
      ...rest.map((point) => ({ kind: "line-to" as const, point })),
      { kind: "close-path" }
    ],
    fillStyle: command.fillStyle
  };
}

/**
 * Transforms one path segment without changing its curve family.
 *
 * @param segment - Selected path segment.
 * @param transform - Center-fixed frame transform.
 * @returns Transformed path segment.
 */
function transformSelectionPathSegment(
  segment: QuirePathCommand["segments"][number],
  transform: QuireAffineTransform
): QuirePathCommand["segments"][number] {
  switch (segment.kind) {
    case "move-to":
    case "line-to":
      return {
        ...segment,
        point: transformQuirePoint(segment.point, transform)
      };
    case "quadratic-curve-to":
      return {
        ...segment,
        control: transformQuirePoint(segment.control, transform),
        point: transformQuirePoint(segment.point, transform)
      };
    case "bezier-curve-to":
      return {
        ...segment,
        control1: transformQuirePoint(segment.control1, transform),
        control2: transformQuirePoint(segment.control2, transform),
        point: transformQuirePoint(segment.point, transform)
      };
    case "close-path":
      return segment;
  }
}

/**
 * Rotates one target while retaining an exact transformed polygon.
 *
 * @param target - Compiled selected interaction target.
 * @param transform - Center-fixed frame transform.
 * @returns Target with coarse bounds and exact hit geometry.
 */
function transformSelectionTarget(
  target: QuireViewTarget,
  transform: QuireAffineTransform
): QuireViewTarget {
  const hitArea = target.hitArea === undefined
    ? createQuireTransformedRectHitArea(target.rect, transform)
    : transformQuireHitArea(target.hitArea, transform);
  return {
    ...target,
    rect: resolveQuirePointBounds(hitArea.points),
    hitArea
  };
}

/**
 * Resolves transformed axis-aligned bounds for one rectangle.
 *
 * @param rect - Source rectangle.
 * @param transform - Center-fixed frame transform.
 * @returns Coarse transformed bounds.
 */
function resolveTransformedRectBounds(
  rect: QuireRect,
  transform: QuireAffineTransform
): QuireRect {
  return resolveQuirePointBounds(
    createQuireTransformedRectHitArea(rect, transform).points
  );
}
