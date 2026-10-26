import type { QuirePoint } from "@quirekit/renderer";
import { resizeQuireDrawingFrame } from "./resize/frame";
import type {
  QuireDrawingControllerOptions,
  QuireDrawingFrame,
  QuireDrawingResizeHandle,
  QuireDrawingTransientTrack
} from "../types";

const defaultMinimumExtent = { width: 12, height: 12 } as const;

/**
 * Measures one CSS-client pointer displacement.
 *
 * @param start - Gesture start point.
 * @param current - Current pointer point.
 * @returns Euclidean displacement.
 */
export function measureQuireDrawingPointerDistance(
  start: QuirePoint,
  current: QuirePoint
): number {
  return Math.hypot(current.x - start.x, current.y - start.y);
}

/**
 * Creates the latest transient track for one manipulation family.
 *
 * @param kind - Manipulation family.
 * @param startFrame - Accepted frame when the gesture began.
 * @param startPoint - Projected gesture origin.
 * @param currentPoint - Latest projected pointer point.
 * @param handle - Optional resize handle.
 * @param lockAspectRatio - Whether resize preserves aspect ratio.
 * @param options - Gesture geometry policy.
 * @returns Immutable transient preview track.
 */
export function createQuireDrawingManipulationTrack(
  kind: "move" | "resize" | "rotate",
  startFrame: QuireDrawingFrame,
  startPoint: QuirePoint,
  currentPoint: QuirePoint,
  handle: QuireDrawingResizeHandle | undefined,
  lockAspectRatio: boolean,
  options: QuireDrawingControllerOptions
): QuireDrawingTransientTrack {
  const previewFrame = kind === "move"
    ? moveFrame(startFrame, startPoint, currentPoint)
    : kind === "resize" && handle !== undefined
      ? resizeQuireDrawingFrame(
          startFrame,
          startPoint,
          currentPoint,
          handle,
          lockAspectRatio,
          options.minimumExtent ?? defaultMinimumExtent,
          options
        )
      : rotateFrame(startFrame, startPoint, currentPoint);
  return {
    kind,
    startFrame,
    previewFrame,
    startPoint,
    currentPoint
  };
}

/**
 * Translates a frame by pointer displacement.
 *
 * @param frame - Accepted start frame.
 * @param start - Gesture origin.
 * @param current - Current pointer point.
 * @returns Translated preview frame.
 */
function moveFrame(
  frame: QuireDrawingFrame,
  start: QuirePoint,
  current: QuirePoint
): QuireDrawingFrame {
  return {
    ...frame,
    rect: {
      ...frame.rect,
      x: frame.rect.x + current.x - start.x,
      y: frame.rect.y + current.y - start.y
    }
  };
}

/**
 * Rotates a frame around its accepted center.
 *
 * @param frame - Accepted start frame.
 * @param start - Gesture origin.
 * @param current - Current pointer point.
 * @returns Rotated preview frame.
 */
function rotateFrame(
  frame: QuireDrawingFrame,
  start: QuirePoint,
  current: QuirePoint
): QuireDrawingFrame {
  const center = {
    x: frame.rect.x + frame.rect.width / 2,
    y: frame.rect.y + frame.rect.height / 2
  };
  const startAngle = Math.atan2(start.y - center.y, start.x - center.x);
  const currentAngle = Math.atan2(current.y - center.y, current.x - center.x);
  const delta = (currentAngle - startAngle) * 180 / Math.PI;
  return { ...frame, rotation: normalizeRotation(frame.rotation + delta) };
}

/**
 * Normalizes a clockwise rotation to `[0, 360)`.
 *
 * @param rotation - Candidate degree value.
 * @returns Normalized rotation.
 */
function normalizeRotation(rotation: number): number {
  const normalized = rotation % 360;
  const positive = normalized < 0 ? normalized + 360 : normalized;
  return Math.abs(positive) < 1e-10 ? 0 : Math.round(positive * 1e10) / 1e10;
}
