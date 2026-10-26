/** The caret in the latest presented frame, including transient IME preview. */
export interface QuireMountedCaretRect {
  /** Left edge in client CSS pixels. */
  readonly left: number;
  /** Right edge in client CSS pixels. */
  readonly right: number;
  /** Top edge in client CSS pixels. */
  readonly top: number;
  /** Bottom edge in client CSS pixels. */
  readonly bottom: number;
}

/** One passive text-range rectangle in browser client CSS pixels. */
export interface QuireMountedTextRangeRect {
  /** Left edge in client CSS pixels. */
  readonly x: number;
  /** Top edge in client CSS pixels. */
  readonly y: number;
  /** Width of this actual visual line segment. */
  readonly width: number;
  /** Height of this actual visual line segment. */
  readonly height: number;
}
