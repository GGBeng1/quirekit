/** One inert rendered source captured for the lifetime of a drag gesture. */
export interface BlockDragSnapshot {
  /** Detached visual tree, owned only by the preview component. */
  readonly dom: HTMLElement;
  /** Natural source width in client CSS pixels. */
  readonly width: number;
  /** Visible preview height, clipping oversized source content. */
  readonly height: number;
  /** Press offset from the source top-left, retained as the pointer moves. */
  readonly offset: { readonly x: number; readonly y: number };
}
