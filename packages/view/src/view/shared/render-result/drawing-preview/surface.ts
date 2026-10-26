import type {
  QuireDisplayCommand,
  QuirePathCommand,
  QuirePoint,
  QuireRect
} from "@quirekit/renderer";

/**
 * Projects one supported drawing-surface command between controller frames.
 *
 * Text-like commands deliberately return undefined. A resize track may reshape
 * the drawing shell, but nested story glyphs require accepted layout metrics.
 *
 * @param command - Accepted shell command to project.
 * @param acceptedFrame - Accepted drawing frame that owns command coordinates.
 * @param previewFrame - Current controller resize frame.
 * @returns Projected command, or undefined when the command needs layout replay.
 */
export function projectMountedDrawingSurfaceCommand(
  command: QuireDisplayCommand,
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuireDisplayCommand | undefined {
  switch (command.kind) {
    case "fill-rect":
    case "image":
      return {
        ...command,
        rect: projectSurfaceRect(command.rect, acceptedFrame, previewFrame)
      };
    case "line":
      return {
        ...command,
        from: projectSurfacePoint(command.from, acceptedFrame, previewFrame),
        to: projectSurfacePoint(command.to, acceptedFrame, previewFrame)
      };
    case "path":
      return {
        ...command,
        rect: projectSurfaceRect(command.rect, acceptedFrame, previewFrame),
        segments: command.segments.map((segment) =>
          projectSurfacePathSegment(segment, acceptedFrame, previewFrame)
        )
      };
    case "clip": {
      const commands = projectMountedDrawingSurfaceCommands(
        command.commands,
        acceptedFrame,
        previewFrame
      );
      return commands === undefined
        ? undefined
        : {
            ...command,
            rect: projectSurfaceRect(command.rect, acceptedFrame, previewFrame),
            commands
          };
    }
    case "text":
    case "glyph-run":
    case "caret":
      return undefined;
  }
}

/**
 * Projects an exact shell command family atomically.
 *
 * @param commands - Accepted shell commands in paint order.
 * @param acceptedFrame - Accepted drawing frame.
 * @param previewFrame - Current controller resize frame.
 * @returns Projected commands, or undefined when any command is unsupported.
 */
export function projectMountedDrawingSurfaceCommands(
  commands: readonly QuireDisplayCommand[],
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): readonly QuireDisplayCommand[] | undefined {
  const projected: QuireDisplayCommand[] = [];
  for (const command of commands) {
    const next = projectMountedDrawingSurfaceCommand(
      command,
      acceptedFrame,
      previewFrame
    );
    if (next === undefined) {
      return undefined;
    }
    projected.push(next);
  }
  return projected;
}

/**
 * Maps one rectangle through the accepted-to-preview frame transform.
 *
 * @param rect - Accepted document-space rectangle.
 * @param acceptedFrame - Accepted drawing frame.
 * @param previewFrame - Current controller resize frame.
 * @returns Rectangle projected into preview geometry.
 */
function projectSurfaceRect(
  rect: QuireRect,
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuireRect {
  const topLeft = projectSurfacePoint(rect, acceptedFrame, previewFrame);
  const scale = resolveSurfaceScale(acceptedFrame, previewFrame);
  return {
    x: topLeft.x,
    y: topLeft.y,
    width: rect.width * scale.x,
    height: rect.height * scale.y
  };
}

/**
 * Maps one point through the accepted-to-preview frame transform.
 *
 * @param point - Accepted document-space point.
 * @param acceptedFrame - Accepted drawing frame.
 * @param previewFrame - Current controller resize frame.
 * @returns Point projected into preview geometry.
 */
function projectSurfacePoint(
  point: QuirePoint,
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuirePoint {
  const scale = resolveSurfaceScale(acceptedFrame, previewFrame);
  return {
    x: previewFrame.x + (point.x - acceptedFrame.x) * scale.x,
    y: previewFrame.y + (point.y - acceptedFrame.y) * scale.y
  };
}

/**
 * Resolves non-zero controller frame scale factors.
 *
 * @param acceptedFrame - Accepted drawing frame.
 * @param previewFrame - Current controller resize frame.
 * @returns Horizontal and vertical projection scale.
 */
function resolveSurfaceScale(
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuirePoint {
  return {
    x: acceptedFrame.width === 0 ? 1 : previewFrame.width / acceptedFrame.width,
    y: acceptedFrame.height === 0 ? 1 : previewFrame.height / acceptedFrame.height
  };
}

/**
 * Projects one path segment without changing stroke metrics.
 *
 * @param segment - Accepted path segment.
 * @param acceptedFrame - Accepted drawing frame.
 * @param previewFrame - Current controller resize frame.
 * @returns Segment projected into preview geometry.
 */
function projectSurfacePathSegment(
  segment: QuirePathCommand["segments"][number],
  acceptedFrame: QuireRect,
  previewFrame: QuireRect
): QuirePathCommand["segments"][number] {
  switch (segment.kind) {
    case "move-to":
    case "line-to":
      return {
        ...segment,
        point: projectSurfacePoint(segment.point, acceptedFrame, previewFrame)
      };
    case "quadratic-curve-to":
      return {
        ...segment,
        control: projectSurfacePoint(segment.control, acceptedFrame, previewFrame),
        point: projectSurfacePoint(segment.point, acceptedFrame, previewFrame)
      };
    case "bezier-curve-to":
      return {
        ...segment,
        control1: projectSurfacePoint(segment.control1, acceptedFrame, previewFrame),
        control2: projectSurfacePoint(segment.control2, acceptedFrame, previewFrame),
        point: projectSurfacePoint(segment.point, acceptedFrame, previewFrame)
      };
    case "close-path":
      return segment;
  }
}
