import type {
  QuireDisplayCommand,
  QuireImageCommand
} from "@quirekit/renderer";
import {
  createQuireImageTransformMatrix,
  resolveQuireImagePaintBounds,
  resolveQuireImageTransformCorners
} from "@quirekit/renderer";
import type { QuireMountedImageResourceState } from "./types";

/**
 * Creates one deterministic placeholder for an unavailable image.
 *
 * @param command - Portable image command.
 * @param status - Current mounted resource state.
 * @returns Renderer-neutral placeholder command.
 */
export function createQuireMountedImagePlaceholder(
  command: QuireImageCommand,
  status: QuireMountedImageResourceState["status"]
): QuireDisplayCommand {
  const fillStyle = resolveImagePlaceholderFill(status);
  if (createQuireImageTransformMatrix(command.rect, command.transform) !== null) {
    const corners = resolveQuireImageTransformCorners(
      command.rect,
      command.transform
    );
    return {
      id: `${command.id}:placeholder`,
      kind: "path",
      rect: resolveQuireImagePaintBounds(command),
      segments: [
        { kind: "move-to", point: corners[0] },
        { kind: "line-to", point: corners[1] },
        { kind: "line-to", point: corners[2] },
        { kind: "line-to", point: corners[3] },
        { kind: "close-path" }
      ],
      fillStyle,
      ...(command.range === undefined ? {} : { range: command.range }),
      ...(command.layer === undefined ? {} : { layer: command.layer }),
      ...(command.opacity === undefined ? {} : { opacity: command.opacity })
    };
  }

  return {
    id: `${command.id}:placeholder`,
    kind: "fill-rect",
    rect: command.rect,
    fillStyle,
    ...(command.range === undefined ? {} : { range: command.range }),
    ...(command.layer === undefined ? {} : { layer: command.layer }),
    ...(command.opacity === undefined ? {} : { opacity: command.opacity })
  };
}

/**
 * Resolves deterministic placeholder color for one mounted resource state.
 *
 * @param status - Current image resource state.
 * @returns Stable placeholder fill color.
 */
function resolveImagePlaceholderFill(
  status: QuireMountedImageResourceState["status"]
): string {
  return status === "failed"
    ? "#fef2f2"
    : status === "loading"
      ? "#eef2ff"
      : "#f3f4f6";
}
