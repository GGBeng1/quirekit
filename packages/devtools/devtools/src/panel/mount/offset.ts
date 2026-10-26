/** Panel offset in CSS pixels. */
export interface QuireDevtoolsPanelOffset {
  /** Horizontal offset from the default dock position. */
  readonly x: number;
  /** Vertical offset from the default dock position. */
  readonly y: number;
}

/**
 * Renders panel transform style for an offset.
 *
 * @param offset - Panel offset.
 * @returns Inline transform style.
 */
export function renderPanelOffsetStyle(offset: QuireDevtoolsPanelOffset): string {
  const transform = renderPanelOffsetTransform(offset);

  return transform === ""
    ? ""
    : `transform:${transform}`;
}

/**
 * Renders the CSS transform property value for an offset.
 *
 * @param offset - Panel offset.
 * @returns CSS transform value.
 */
export function renderPanelOffsetTransform(offset: QuireDevtoolsPanelOffset): string {
  return offset.x === 0 && offset.y === 0
    ? ""
    : `translate3d(${offset.x}px,${offset.y}px,0)`;
}

/**
 * Keeps panel dragging within a loose viewport boundary.
 *
 * @param offset - Requested panel offset.
 * @param ownerDocument - Owner document used to find the viewport.
 * @returns Clamped panel offset.
 */
export function clampPanelOffset(
  offset: QuireDevtoolsPanelOffset,
  ownerDocument: Document | undefined
): QuireDevtoolsPanelOffset {
  const view = ownerDocument?.defaultView;

  if (!view) {
    return offset;
  }

  const maxX = Math.max(80, view.innerWidth / 2 - 48);
  const minY = -Math.max(120, view.innerHeight - 120);

  return {
    x: Math.min(maxX, Math.max(-maxX, offset.x)),
    y: Math.min(80, Math.max(minY, offset.y))
  };
}
