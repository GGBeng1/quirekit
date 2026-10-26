/** Public ScrollArea operations used by the emoji section navigator. */
export interface EmojiScrollHandle {
  /** Native scrolling viewport after mount. */ readonly getViewportElement: () => HTMLElement | null;
  /** Scrolls the one shared viewport, leaving the host document untouched. */ readonly scrollTo: (details: ScrollToOptions) => void;
}

/** Cached section position in viewport content coordinates. */
export interface EmojiSectionPosition {
  /** Stable continuous-section identity. */ readonly key: string;
  /** Heading offset from the start of the scrolling content. */ readonly top: number;
}
