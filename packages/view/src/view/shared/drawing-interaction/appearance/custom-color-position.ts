/** Horizontal side used by a drawing custom-color surface. */
export type DrawingCustomColorSide = "left" | "right";

/** Minimal primary-menu bounds used by nested-popover placement. */
export interface DrawingCustomColorAnchorBounds {
  /** Viewport-space left edge. */
  readonly left: number;
  /** Viewport-space right edge. */
  readonly right: number;
  /** Viewport-space top edge. */
  readonly top: number;
}

/** Secondary-surface dimensions used by nested-popover placement. */
export interface DrawingCustomColorPanelSize {
  /** Secondary-surface width. */
  readonly width: number;
  /** Secondary-surface height. */
  readonly height: number;
}

/** Viewport dimensions used by nested-popover placement. */
export interface DrawingCustomColorViewport {
  /** Viewport width. */
  readonly width: number;
  /** Viewport height. */
  readonly height: number;
}

/** Resolved non-overlapping drawing custom-color placement. */
export interface DrawingCustomColorPlacement {
  /** Horizontal side of the primary menu. */
  readonly side: DrawingCustomColorSide;
  /** Top offset relative to the primary menu. */
  readonly top: number;
}

/**
 * Resolves a side-adjacent custom-color surface without covering presets.
 *
 * @param anchor - Primary drawing appearance menu bounds.
 * @param panel - Secondary custom-color surface dimensions.
 * @param viewport - Current viewport dimensions.
 * @param gap - Required distance between primary and secondary surfaces.
 * @param edge - Minimum viewport-edge clearance.
 * @returns Preferred-right or flipped-left placement with a clamped top.
 */
export function resolveDrawingCustomColorPlacement(
  anchor: DrawingCustomColorAnchorBounds,
  panel: DrawingCustomColorPanelSize,
  viewport: DrawingCustomColorViewport,
  gap = 8,
  edge = 8
): DrawingCustomColorPlacement {
  const rightSpace = viewport.width - edge - anchor.right;
  const leftSpace = anchor.left - edge;
  const requiredWidth = panel.width + gap;
  const side = rightSpace >= requiredWidth
    ? "right"
    : leftSpace >= requiredWidth
      ? "left"
      : rightSpace >= leftSpace ? "right" : "left";
  const viewportTop = Math.min(
    Math.max(edge, anchor.top),
    Math.max(edge, viewport.height - panel.height - edge)
  );
  return {
    side,
    top: viewportTop - anchor.top
  };
}

/**
 * Applies side-aware placement to one visible drawing custom-color surface.
 *
 * @param menu - Primary drawing appearance menu.
 * @param panel - Secondary custom-color surface.
 * @param ownerDocument - Document supplying viewport dimensions.
 */
export function positionDrawingCustomColorPanel(
  menu: HTMLElement,
  panel: HTMLElement,
  ownerDocument: Document
): void {
  const menuRect = menu.getBoundingClientRect();
  const panelRect = panel.getBoundingClientRect();
  const placement = resolveDrawingCustomColorPlacement(
    menuRect,
    {
      width: panelRect.width || 260,
      height: panelRect.height || 240
    },
    {
      width: ownerDocument.documentElement.clientWidth,
      height: ownerDocument.documentElement.clientHeight
    }
  );
  panel.dataset.qkDrawingCustomColorSide = placement.side;
  panel.style.top = `${placement.top}px`;
  if (placement.side === "right") {
    panel.style.right = "auto";
    panel.style.left = "calc(100% + 9px)";
  } else {
    panel.style.right = "calc(100% + 9px)";
    panel.style.left = "auto";
  }
}
