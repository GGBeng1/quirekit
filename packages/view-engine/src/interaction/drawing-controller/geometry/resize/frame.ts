import {
  snapQuireAffineNumber,
  type QuirePoint
} from "@quirekit/renderer";
import type {
  QuireDrawingFrame,
  QuireDrawingResizeHandle
} from "../../types";
import type { DrawingResizePolicy } from "@quirekit/drawing-geometry";
import { constrainResizeExtent } from "./extent";

/**
 * Resizes a frame while anchoring the opposite edge or corner.
 *
 * @param frame - Accepted start frame.
 * @param start - Gesture origin.
 * @param current - Current pointer point.
 * @param handle - Resize handle owning the gesture.
 * @param lockAspectRatio - Whether the accepted ratio is preserved.
 * @param minimum - Smallest allowed extent.
 * @param policy - Optional owner bounds and input-size grid.
 * @returns Resized preview frame.
 */
export function resizeQuireDrawingFrame(
  frame: QuireDrawingFrame,
  start: QuirePoint,
  current: QuirePoint,
  handle: QuireDrawingResizeHandle,
  lockAspectRatio: boolean,
  minimum: Readonly<{ width: number; height: number }>,
  policy: DrawingResizePolicy = {}
): QuireDrawingFrame {
  const axis = resolveResizeHandleAxis(handle);
  const rotation = resolveRotation(frame.rotation);
  const documentDelta = {
    x: current.x - start.x,
    y: current.y - start.y
  };
  const localDelta = {
    x: rotation.cosine * documentDelta.x + rotation.sine * documentDelta.y,
    y: -rotation.sine * documentDelta.x + rotation.cosine * documentDelta.y
  };
  const rawExtent = {
    width: Math.max(
      minimum.width,
      frame.rect.width + axis.inline * localDelta.x
    ),
    height: Math.max(
      minimum.height,
      frame.rect.height + axis.block * localDelta.y
    )
  };
  const requested = lockAspectRatio
    ? resolveAspectLockedExtent(frame, rawExtent, axis, minimum)
    : rawExtent;
  const extent = constrainResizeExtent(requested, minimum, policy, lockAspectRatio, axis.inline !== 0);

  // The accepted extent delta moves the center by half along each active
  // local axis. Rotating that shift back to document space preserves the
  // opposite local edge or corner.
  const localCenterShift = {
    x: axis.inline * (extent.width - frame.rect.width) / 2,
    y: axis.block * (extent.height - frame.rect.height) / 2
  };
  const documentCenterShift = {
    x: rotation.cosine * localCenterShift.x
      - rotation.sine * localCenterShift.y,
    y: rotation.sine * localCenterShift.x
      + rotation.cosine * localCenterShift.y
  };
  const center = {
    x: frame.rect.x + frame.rect.width / 2 + documentCenterShift.x,
    y: frame.rect.y + frame.rect.height / 2 + documentCenterShift.y
  };
  return {
    rect: {
      x: policy.preserveOrigin === true ? frame.rect.x : center.x - extent.width / 2,
      y: policy.preserveOrigin === true ? frame.rect.y : center.y - extent.height / 2,
      width: extent.width,
      height: extent.height
    },
    rotation: frame.rotation
  };
}

/**
 * Resolves local-axis direction from one resize handle.
 *
 * @param handle - Directional resize handle.
 * @returns Signed inline and block axes for the active edges.
 */
function resolveResizeHandleAxis(
  handle: QuireDrawingResizeHandle
): Readonly<{ inline: -1 | 0 | 1; block: -1 | 0 | 1 }> {
  return {
    inline: handle.includes("west")
      ? -1
      : handle.includes("east")
        ? 1
        : 0,
    block: handle.includes("north")
      ? -1
      : handle.includes("south")
        ? 1
        : 0
  };
}

/**
 * Resolves stable sine and cosine coefficients for one clockwise rotation.
 *
 * @param rotation - Clockwise degrees.
 * @returns Snapped local/document axis coefficients.
 */
function resolveRotation(
  rotation: number
): Readonly<{ cosine: number; sine: number }> {
  const radians = rotation * Math.PI / 180;
  return {
    cosine: snapQuireAffineNumber(Math.cos(radians)),
    sine: snapQuireAffineNumber(Math.sin(radians))
  };
}

/**
 * Applies the accepted aspect ratio while preserving inactive-axis centering.
 *
 * @param frame - Accepted start frame.
 * @param rawExtent - Pointer-derived minimum-clamped extent.
 * @param axis - Active local handle axes.
 * @param minimum - Minimum admitted extent.
 * @returns Aspect-locked extent satisfying both minimum dimensions.
 */
function resolveAspectLockedExtent(
  frame: QuireDrawingFrame,
  rawExtent: Readonly<{ width: number; height: number }>,
  axis: Readonly<{ inline: -1 | 0 | 1; block: -1 | 0 | 1 }>,
  minimum: Readonly<{ width: number; height: number }>
): Readonly<{ width: number; height: number }> {
  if (frame.rect.height <= 0 || frame.rect.width <= 0) {
    return rawExtent;
  }

  const ratio = frame.rect.width / frame.rect.height;
  if (axis.block === 0) {
    const width = Math.max(rawExtent.width, minimum.height * ratio);
    return { width, height: width / ratio };
  }
  if (axis.inline === 0) {
    const height = Math.max(rawExtent.height, minimum.width / ratio);
    return { width: height * ratio, height };
  }
  if (rawExtent.width / ratio >= rawExtent.height) {
    const width = Math.max(rawExtent.width, minimum.height * ratio);
    return { width, height: width / ratio };
  }

  const height = Math.max(rawExtent.height, minimum.width / ratio);
  return { width: height * ratio, height };
}
