import type {
  EditorUIAnchorRect,
  EditorUIClientAnchorResolution
} from "@quirekit/editor-ui";

/** Root-local placement boundary in client coordinates. */
export interface ClassicEditorObjectPlacementBoundary extends EditorUIAnchorRect {}

/** Measured floating surface size. */
export interface ClassicEditorObjectPlacementSurface {
  /** Surface inline size. */
  readonly width: number;
  /** Surface block size. */
  readonly height: number;
}

/** Inputs for collision-aware object-bar placement. */
export interface ResolveClassicEditorObjectBarPlacementOptions {
  /** Canonical client anchor from the mounted View projection. */
  readonly anchor: EditorUIClientAnchorResolution;
  /** Owning Classic root's visible client boundary. */
  readonly boundary: ClassicEditorObjectPlacementBoundary;
  /** Measured floating bar dimensions. */
  readonly surface: ClassicEditorObjectPlacementSurface;
  /** Desired gap between object fragment and floating bar. */
  readonly gap: number;
}

/** Ready collision-aware placement. */
export interface ClassicEditorObjectBarReadyPlacement {
  /** Ready outcome discriminator. */
  readonly status: "ready";
  /** Client x coordinate projected by the shared document-overlay host. */
  readonly x: number;
  /** Client y coordinate projected by the shared document-overlay host. */
  readonly y: number;
  /** Chosen side relative to the exact visible object fragment. */
  readonly side: "top" | "bottom";
  /** Exact fragment used instead of a cross-page union rectangle. */
  readonly reference: EditorUIAnchorRect;
  /** Whether unavoidable boundary pressure may overlap the reference. */
  readonly occlusion: "none" | "partial";
}

/** Explicit placement failure that forbids DOM or selection fallback. */
export interface ClassicEditorObjectBarUnavailablePlacement {
  /** Unavailable outcome discriminator. */
  readonly status: "unavailable";
  /** Stable machine-readable placement reason. */
  readonly reason: "stale" | "unsupported" | "invalid-boundary" | "offscreen";
}

/** Collision-aware object floating-bar placement outcome. */
export type ClassicEditorObjectBarPlacement =
  | ClassicEditorObjectBarReadyPlacement
  | ClassicEditorObjectBarUnavailablePlacement;

/**
 * Places a floating object bar from canonical client geometry only.
 *
 * Cross-page objects may expose a large union rectangle. This resolver first
 * chooses the visible fragment nearest the root center, then tries above and
 * below without covering it. Boundary clamping is explicit and never measures
 * the document DOM or substitutes the live selection.
 *
 * @param options - Canonical anchor, visible root boundary, surface size, and gap.
 * @returns Ready client placement or an explicit unavailable outcome.
 */
export function resolveClassicEditorObjectBarPlacement(
  options: ResolveClassicEditorObjectBarPlacementOptions
): ClassicEditorObjectBarPlacement {
  if (options.anchor.status === "stale") {
    return { status: "unavailable", reason: "stale" };
  }
  if (options.anchor.status === "unsupported") {
    return { status: "unavailable", reason: "unsupported" };
  }
  if (!isValidBoundary(options)) {
    return { status: "unavailable", reason: "invalid-boundary" };
  }
  const visible = options.anchor.rects.filter((rect) => intersects(rect, options.boundary));
  if (visible.length === 0) return { status: "unavailable", reason: "offscreen" };
  const reference = nearestToBoundaryCenter(visible, options.boundary);
  const top = reference.y - options.gap - options.surface.height;
  const bottom = reference.y + reference.height + options.gap;
  const boundaryBottom = options.boundary.y + options.boundary.height;
  const fitsTop = top >= options.boundary.y;
  const fitsBottom = bottom + options.surface.height <= boundaryBottom;
  const side = fitsTop || !fitsBottom ? "top" : "bottom";
  const desiredY = side === "top" ? top : bottom;
  const y = clamp(
    desiredY,
    options.boundary.y,
    boundaryBottom - options.surface.height
  );
  const desiredX = reference.x + reference.width / 2 - options.surface.width / 2;
  const x = clamp(
    desiredX,
    options.boundary.x,
    options.boundary.x + options.boundary.width - options.surface.width
  );
  const occlusion = overlaps(
    { x, y, width: options.surface.width, height: options.surface.height },
    reference
  ) ? "partial" : "none";
  return { status: "ready", x, y, side, reference, occlusion };
}

/** @param options - Candidate placement inputs. @returns Whether every boundary fact is finite. */
function isValidBoundary(options: ResolveClassicEditorObjectBarPlacementOptions): boolean {
  const values = [
    options.boundary.x,
    options.boundary.y,
    options.boundary.width,
    options.boundary.height,
    options.surface.width,
    options.surface.height,
    options.gap
  ];
  return values.every(Number.isFinite)
    && options.boundary.width > 0
    && options.boundary.height > 0
    && options.surface.width > 0
    && options.surface.height > 0
    && options.surface.width <= options.boundary.width
    && options.surface.height <= options.boundary.height
    && options.gap >= 0;
}

/** @param left - First rectangle. @param right - Second rectangle. @returns Whether areas intersect. */
function intersects(left: EditorUIAnchorRect, right: EditorUIAnchorRect): boolean {
  return left.x < right.x + right.width
    && left.x + left.width > right.x
    && left.y < right.y + right.height
    && left.y + left.height > right.y;
}

/** @param left - First rectangle. @param right - Second rectangle. @returns Whether areas overlap. */
function overlaps(left: EditorUIAnchorRect, right: EditorUIAnchorRect): boolean {
  return intersects(left, right);
}

/**
 * Chooses the visible repeated/cross-page occurrence nearest the root center.
 *
 * @param rects - Visible canonical occurrence rectangles.
 * @param boundary - Root-local viewport boundary.
 * @returns Deterministically selected occurrence rectangle.
 */
function nearestToBoundaryCenter(
  rects: readonly EditorUIAnchorRect[],
  boundary: EditorUIAnchorRect
): EditorUIAnchorRect {
  const centerY = boundary.y + boundary.height / 2;
  return [...rects].sort((left, right) => (
    Math.abs(left.y + left.height / 2 - centerY)
      - Math.abs(right.y + right.height / 2 - centerY)
  ))[0]!;
}

/** @param value - Candidate value. @param min - Inclusive lower bound. @param max - Inclusive upper bound. @returns Clamped value. */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
