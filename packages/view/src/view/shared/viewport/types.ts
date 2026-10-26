import type { QuireRect } from "@quirekit/renderer";

/** CSS-space dimensions consumed by backend-neutral mounted viewport geometry. */
export interface QuireMountedViewportSize {
  /** Surface width in CSS pixels. */
  readonly width: number;
  /** Surface height in CSS pixels. */
  readonly height: number;
}

/** Insets used to derive a logical viewport from a mounted rendering surface. */
export interface QuireMountedViewportPadding {
  /** Left inset in CSS pixels. */
  readonly left: number;
  /** Top inset in CSS pixels. */
  readonly top: number;
  /** Right inset in CSS pixels. */
  readonly right: number;
  /** Bottom inset in CSS pixels. */
  readonly bottom: number;
}

/** Options for resolving backend-neutral mounted viewport geometry. */
export interface ResolveQuireMountedViewportRectOptions {
  /** Measured rendering-surface dimensions in CSS pixels. */
  readonly displaySize: QuireMountedViewportSize;
  /** Explicit logical viewport, which takes precedence over padding. */
  readonly viewportRect?: QuireRect | undefined;
  /** Insets applied when no explicit logical viewport was supplied. */
  readonly viewportPadding?: QuireMountedViewportPadding | undefined;
}

/**
 * Reports the region of the document currently visible in a scroller, in the same
 * document coordinate space as {@link QuireRect} page rectangles, and notifies
 * subscribers when that region changes.
 *
 * A scroll source is backend-neutral: it knows nothing about canvas, SVG, or the
 * page-stack surfaces. It only resolves where the viewport sits over the document
 * so the viewport coordinator can pick the visible pages.
 */
export interface ScrollSource {
  /**
   * Reads the currently visible document region.
   *
   * @returns Visible rectangle in document coordinates (the space of page rects).
   */
  getVisibleRegion(): QuireRect;
  /**
   * Subscribes to visible-region changes (scroll and resize).
   *
   * @param listener - Callback invoked after the visible region may have changed.
   * @returns Unsubscribe function that removes the listener.
   */
  subscribe(listener: () => void): () => void;
  /**
   * Scrolls by a document-space distance, converted to scroller pixels.
   *
   * @param deltaY - Vertical distance in document coordinates; positive scrolls down.
   */
  scrollByDocument?(deltaY: number): void;
  /** Removes every DOM listener and observer owned by this scroll source. */
  destroy(): void;
}

/** Options for the editor-owned inner-viewport scroll source. */
export interface EditorViewportScrollSourceOptions {
  /**
   * The `overflow: auto` element that scrolls the document. Its `scrollLeft`,
   * `scrollTop`, `clientWidth`, and `clientHeight` define the visible region.
   */
  readonly viewport: HTMLElement;
}

/**
 * A designated ancestor scroller. Either a scrollable element (e.g. an embedder's
 * `overflow: auto` container) or the window when the page itself scrolls.
 */
export type AncestorScroller = HTMLElement | Window;

/** Options for the ancestor (page/external) scroll source. */
export interface AncestorScrollSourceOptions {
  /** Ancestor scroller whose viewport slices the document. */
  readonly scroller: AncestorScroller;
  /**
   * Editor content element whose top-left is the document-space origin. The
   * visible region is derived from the scroller viewport minus this element's
   * client offset.
   */
  readonly content: HTMLElement;
}

/**
 * Subscribes to a scroll source and reports which page indices are visible.
 *
 * The coordinator is the single source the content surfaces, selection overlays,
 * and the future a11y mirror read, so they never disagree about which pages are
 * live regardless of which scroll source is active.
 */
export interface ViewportCoordinator {
  /**
   * Reads the current visible document region from the owned scroll source.
   *
   * @returns Visible rectangle in document coordinates.
   */
  getVisibleRegion(): QuireRect;
  /**
   * Resolves the visible page indices for the current scroll position.
   *
   * @param pageRects - Page rectangles in document order, in document space.
   * @param bufferPages - Extra pages to keep live above and below the visible
   * set. Defaults to 0.
   * @returns Ascending page indices intersecting the visible region plus buffer.
   */
  getVisiblePageIndices(pageRects: readonly QuireRect[], bufferPages?: number): number[];
  /**
   * Subscribes to scroll-source changes.
   *
   * @param listener - Callback invoked when the visible region may have changed.
   * @returns Unsubscribe function that removes the listener.
   */
  subscribe(listener: () => void): () => void;
  /** Unsubscribes from the scroll source. */
  destroy(): void;
}

/** Options for {@link createViewportCoordinator}. */
export interface ViewportCoordinatorOptions {
  /** Scroll source whose visible region drives the visible page set. */
  readonly scrollSource: ScrollSource;
}

/** Options for resolving the mounted visible page set with fallback behavior. */
export interface ResolveMountedVisiblePageIndicesOptions {
  /** Viewport coordinator that resolves the scroll-source visible region. */
  readonly coordinator?: ViewportCoordinator | undefined;
  /** Page rectangles in document order, in document space. */
  readonly pageRects: readonly QuireRect[];
  /** Extra pages to keep live above and below the visible set. */
  readonly bufferPages?: number | undefined;
}

/** Elements sized to the full document height by the document-height sizer. */
export interface DocumentHeightSizerTargets {
  /** In-flow View surface that contributes the complete native scroll height. */
  readonly scrollSurface?: HTMLElement | undefined;
  /** Page-stack host that owns the per-page frames. */
  readonly pageStackHost: HTMLElement;
  /**
   * Pointer/coordinate layer. Sized too so full-document hit testing keeps
   * working when only a subset of frames is mounted.
   */
  readonly coordinateSurface?: HTMLElement | undefined;
  /**
   * Document-sized in-flow or coordinate surface used by a backend to preserve
   * native scroll range when page frames are virtualized.
   */
  readonly documentSurface?: HTMLElement | undefined;
}

/** Options for {@link applyDocumentHeightSizing}. */
export interface ApplyDocumentHeightSizingOptions {
  /** Screen-only trailing space added to the scroll host, leaving coordinate bounds intact. */
  readonly bottomPadding?: number | undefined;
  /** Elements to size to the document height. */
  readonly targets: DocumentHeightSizerTargets;
  /** Full document bounds in document space. */
  readonly documentRect: QuireRect;
}
