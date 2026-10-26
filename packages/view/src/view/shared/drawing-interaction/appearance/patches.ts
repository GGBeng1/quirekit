import type { DrawingAnchor, DrawingAnchorPatch, DrawingStroke } from "@quirekit/drawing-geometry";

/**
 * Creates a complete drawing replacement for one fill color choice.
 *
 * @param current - Live canonical attrs for the exact selected anchor.
 * @param color - Solid color token, or null to disable fill.
 * @returns Anchor patch retaining opacity and unrelated drawing fields.
 */
export function createDrawingFillColorPatch(
  current: DrawingAnchor,
  color: string | null
): DrawingAnchorPatch {
  return createAppearancePatch(current, {
    ...current.drawing.appearance,
    fill: {
      kind: color === null ? "none" : "solid",
      color,
      opacity: current.drawing.appearance.fill.opacity
    }
  });
}

/**
 * Creates a complete drawing replacement for one outline color choice.
 *
 * @param current - Live canonical attrs for the exact selected anchor.
 * @param color - Solid color token, or null to disable the outline.
 * @returns Anchor patch retaining width, opacity, dash, and unrelated fields.
 */
export function createDrawingStrokeColorPatch(
  current: DrawingAnchor,
  color: string | null
): DrawingAnchorPatch {
  return createAppearancePatch(current, {
    ...current.drawing.appearance,
    stroke: color === null
      ? {
          ...current.drawing.appearance.stroke,
          kind: "none",
          color: null
        }
      : {
          ...materializeSolidStroke(current.drawing.appearance.stroke),
          color
        }
  });
}

/**
 * Creates a complete drawing replacement for one outline width choice.
 *
 * @param current - Live canonical attrs for the exact selected anchor.
 * @param width - Positive outline width in layout units.
 * @returns Anchor patch retaining color, opacity, dash, and unrelated fields.
 */
export function createDrawingStrokeWidthPatch(
  current: DrawingAnchor,
  width: number
): DrawingAnchorPatch {
  return createAppearancePatch(current, {
    ...current.drawing.appearance,
    stroke: {
      ...materializeSolidStroke(current.drawing.appearance.stroke),
      width
    }
  });
}

/**
 * Creates a complete drawing replacement for one outline dash choice.
 *
 * @param current - Live canonical attrs for the exact selected anchor.
 * @param dash - Canonical outline dash preset.
 * @returns Anchor patch retaining color, width, opacity, and unrelated fields.
 */
export function createDrawingStrokeDashPatch(
  current: DrawingAnchor,
  dash: DrawingStroke["dash"]
): DrawingAnchorPatch {
  return createAppearancePatch(current, {
    ...current.drawing.appearance,
    stroke: {
      ...materializeSolidStroke(current.drawing.appearance.stroke),
      dash
    }
  });
}

/**
 * Materializes valid solid outline fields without discarding disabled-state data.
 *
 * @param current - Current canonical outline.
 * @returns Solid outline using a black 1px default only for absent paint geometry.
 */
function materializeSolidStroke(
  current: DrawingStroke
): DrawingStroke {
  return {
    ...current,
    kind: "solid",
    color: current.color ?? "#000000",
    width: current.width > 0 ? current.width : 1
  };
}

/**
 * Wraps one appearance replacement in the complete canonical drawing payload.
 *
 * @param current - Live canonical anchor attrs.
 * @param appearance - Replacement canonical appearance.
 * @returns Mutable anchor patch accepted by the exact Word command.
 */
function createAppearancePatch(
  current: DrawingAnchor,
  appearance: DrawingAnchor["drawing"]["appearance"]
): DrawingAnchorPatch {
  return {
    drawing: {
      ...current.drawing,
      appearance
    }
  };
}
