import type { DrawingExtent, DrawingTransform } from "@quirekit/drawing-geometry";
import {
  resolveQuireImagePaintBounds,
  type QuireImageCommand,
  type QuireImageTransform
} from "@quirekit/renderer";
import type { QuireInlineSourceVisualOverflow } from "../types";

/**
 * Projects canonical Word Picture transform intent into renderer semantics.
 *
 * @param transform - Canonical drawing transform.
 * @returns Picture image transform, or undefined for the identity fast path.
 */
export function createQuireWordPictureImageTransform(
  transform: DrawingTransform
): QuireImageTransform | undefined {
  if (
    transform.rotation % 360 === 0
    && !transform.flipHorizontal
    && !transform.flipVertical
  ) {
    return undefined;
  }

  return {
    rotation: transform.rotation,
    flipHorizontal: transform.flipHorizontal,
    flipVertical: transform.flipVertical
  };
}

/**
 * Resolves physical overflow required to retain transformed Picture pixels.
 *
 * @param extent - Accepted Picture destination extent.
 * @param transform - Renderer-neutral Picture transform.
 * @returns Positive physical overflow, or undefined when paint stays in-frame.
 */
export function resolveQuireWordPictureVisualOverflow(
  extent: DrawingExtent,
  transform: QuireImageTransform | undefined
): QuireInlineSourceVisualOverflow | undefined {
  if (transform === undefined) {
    return undefined;
  }

  const rect = { x: 0, y: 0, width: extent.width, height: extent.height };
  const paintBounds = resolveQuireImagePaintBounds({
    id: "picture-transform-bounds",
    kind: "image",
    rect,
    transform
  } satisfies QuireImageCommand);
  const overflow = {
    top: Math.max(0, rect.y - paintBounds.y),
    right: Math.max(
      0,
      paintBounds.x + paintBounds.width - (rect.x + rect.width)
    ),
    bottom: Math.max(
      0,
      paintBounds.y + paintBounds.height - (rect.y + rect.height)
    ),
    left: Math.max(0, rect.x - paintBounds.x)
  };

  return overflow.top === 0
    && overflow.right === 0
    && overflow.bottom === 0
    && overflow.left === 0
    ? undefined
    : overflow;
}
