import type { DrawingPayload } from "@quirekit/drawing-geometry";

/**
 * Separates editing chrome from the authored outline without moving controls.
 * @param drawing - Optional canonical drawing; pictures retain their existing frame.
 * @returns Frame-local outward offset for shape selection paint only.
 */
export function resolveQuireDrawingSelectionOutlineOffset(drawing: DrawingPayload | undefined): number {
  if (drawing === undefined || drawing.kind === "picture" || drawing.kind === "embedded") return 0;
  const stroke = drawing.appearance.stroke;
  return 3 + (stroke.kind === "none" ? 0 : stroke.width / 2);
}
