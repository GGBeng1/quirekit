import type { DrawingPayload, DrawingTextInsets } from "@quirekit/drawing-geometry";
import { resolveWordDrawingGeometry } from "./resolve";

/**
 * Combines the geometry text rectangle with text-body insets exactly once.
 * @param drawing - Canonical drawing source.
 * @returns Physical local insets shared by Story layout and text-entry targets.
 */
export function resolveQuireWordShapeTextInsets(drawing: DrawingPayload): DrawingTextInsets {
  const body = drawing.textBody?.insets ?? { left: 0, top: 0, right: 0, bottom: 0 };
  const { width, height } = drawing.extent;
  const rect = resolveWordDrawingGeometry(drawing, width, height).textRect;
  return { left: rect.left * width + body.left, top: rect.top * height + body.top,
    right: (1 - rect.right) * width + body.right, bottom: (1 - rect.bottom) * height + body.bottom };
}
