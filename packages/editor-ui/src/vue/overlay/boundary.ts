import type {
  EditorUIAnchoredOverlayAnchor,
  EditorUIAnchoredOverlayPlacement,
  EditorUIOverlayBoundaryInput,
  EditorUIOverlayRect
} from "./types";

const gap = 8;

/**
 * Places a surface inside the workspace until its complete target leaves it.
 * @param input - Viewport target, measured surface and visible workspace.
 * @returns The surface's viewport top-left coordinate.
 */
export function resolveOverlayBoundaryPosition(
  input: EditorUIOverlayBoundaryInput
): EditorUIAnchoredOverlayAnchor {
  const { anchor, boundary, placement } = input;
  const width = Math.min(input.surface.width, Math.max(0, boundary.width - gap * 2));
  const height = Math.min(input.surface.height, Math.max(0, boundary.height - gap * 2));
  const rects = anchor.rects?.length ? anchor.rects : [{ ...anchor, width: 0, height: 0 }];
  const reference = chooseReference(rects, boundary);

  // Solve at the last boundary contact, then apply the offscreen displacement.
  // This keeps partial targets usable and releases the constraint continuously.
  const dx = outsideDistance(reference.x, reference.width, boundary.x, boundary.width);
  const dy = outsideDistance(reference.y, reference.height, boundary.y, boundary.height);
  const contact = { x: reference.x - dx, y: reference.y - dy, width: reference.width, height: reference.height };
  const point = { x: anchor.x - dx, y: anchor.y - dy };
  const preferred = candidate(contact, point, placement, width, height);
  const opposite = candidate(contact, point, oppositePlacement(placement), width, height);
  const vertical = placement.startsWith("top") || placement.startsWith("bottom");
  /** @param position - Unconstrained candidate. @returns Whether its side axis fits without covering the target. */
  const fits = (position: EditorUIAnchoredOverlayAnchor): boolean => vertical
    ? position.y >= boundary.y + gap && position.y + height <= boundary.y + boundary.height - gap
    : position.x >= boundary.x + gap && position.x + width <= boundary.x + boundary.width - gap;
  const position = placement !== "exact" && !fits(preferred) && fits(opposite) ? opposite : preferred;
  return {
    x: clamp(position.x, boundary.x + gap, boundary.x + boundary.width - width - gap) + dx,
    y: clamp(position.y, boundary.y + gap, boundary.y + boundary.height - height - gap) + dy
  };
}

/** @param rects - Canonical target fragments. @param boundary - Visible workspace. @returns A visible fragment, or the closest offscreen one. */
function chooseReference(rects: readonly EditorUIOverlayRect[], boundary: EditorUIOverlayRect): EditorUIOverlayRect {
  let result = rects[0]!;
  let best = Infinity;
  for (const rect of rects) {
    const dx = outsideDistance(rect.x, rect.width, boundary.x, boundary.width);
    const dy = outsideDistance(rect.y, rect.height, boundary.y, boundary.height);
    const distance = Math.hypot(dx, dy);
    if (distance < best) { best = distance; result = rect; }
  }
  return result;
}

/** @param start - Target origin. @param size - Target extent. @param edge - Boundary origin. @param extent - Boundary extent. @returns Signed distance after the whole target leaves this axis. */
function outsideDistance(start: number, size: number, edge: number, extent: number): number {
  return start + size < edge ? start + size - edge : start > edge + extent ? start - edge - extent : 0;
}

/** @param rect - Target fragment. @param point - Explicit exact anchor. @param placement - Requested alignment. @param width - Surface width. @param height - Surface height. @returns Unconstrained top-left placement. */
function candidate(rect: EditorUIOverlayRect, point: EditorUIAnchoredOverlayAnchor, placement: EditorUIAnchoredOverlayPlacement, width: number, height: number): EditorUIAnchoredOverlayAnchor {
  if (placement === "exact") return point;
  const [side, alignment] = placement.split("-");
  const vertical = side === "top" || side === "bottom";
  const cross = alignment === "start" ? 0 : alignment === "end" ? 1 : 0.5;
  return vertical ? {
    x: rect.x + (rect.width - width) * cross,
    y: side === "top" ? rect.y - height - gap : rect.y + rect.height + gap
  } : {
    x: side === "left" ? rect.x - width - gap : rect.x + rect.width + gap,
    y: rect.y + (rect.height - height) * cross
  };
}

/** @param placement - Preferred side and alignment. @returns Opposite side with the same alignment. */
function oppositePlacement(placement: EditorUIAnchoredOverlayPlacement): EditorUIAnchoredOverlayPlacement {
  if (placement === "exact") return placement;
  const [side, alignment] = placement.split("-");
  const opposite = { top: "bottom", bottom: "top", left: "right", right: "left" }[side!];
  return `${opposite}${alignment ? `-${alignment}` : ""}` as EditorUIAnchoredOverlayPlacement;
}

/** @param value - Desired coordinate. @param min - Near edge. @param max - Far edge. @returns A coordinate within the available interval. */
function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}
