/** A client CSS-pixel point accepted from a native pointer or public handle. */
export interface SourceClientPoint {
  /** Horizontal client coordinate, before editor-local scaling. */
  readonly x: number;
  /** Vertical client coordinate, including visual-viewport offset. */
  readonly y: number;
}

/** Actual unobscured client viewport shared by input reveal and dragging. */
export interface SourceViewportBounds {
  /** Left clipping edge after host margins. */
  readonly left: number;
  /** Right clipping edge after host margins. */
  readonly right: number;
  /** Top clipping edge after host margins. */
  readonly top: number;
  /** Bottom clipping edge above keyboard and product chrome. */
  readonly bottom: number;
}

/** One measured vertical scroll write; geometry is read before any mutation. */
export interface SourceScrollStep {
  /** Scrolling element, or window when the outer document owns the movement. */
  readonly owner: HTMLElement | Window;
  /** Accepted target scroll offset in that owner's CSS space. */
  readonly top: number;
  /** Current horizontal offset, preserved by the vertical-only operation. */
  readonly left: number;
}
