/** A visible selection fragment in one caller-owned coordinate space. */
export interface QuireSelectionPaintRect {
  /** Left edge. */
  readonly left: number;
  /** Right edge. */
  readonly right: number;
  /** Top edge. */
  readonly top: number;
  /** Bottom edge. */
  readonly bottom: number;
}

/** Selected fragments belonging to one visual row of a single text owner. */
export interface QuireSelectionTextBand<T extends QuireSelectionPaintRect> {
  /** Highest selected glyph or inline surface edge. */
  readonly top: number;
  /** Lowest selected glyph or inline surface edge. */
  readonly bottom: number;
  /** Original fragments, preserving caller provenance and horizontal gaps. */
  readonly rects: readonly T[];
}

/** Mutable construction state; the common intersection prevents wrapped-row chaining. */
export interface SelectionTextBandBuilder<T extends QuireSelectionPaintRect> {
  /** Highest selected edge. */
  top: number;
  /** Lowest selected edge. */
  bottom: number;
  /** Top of the common vertical intersection. */
  sharedTop: number;
  /** Bottom of the common vertical intersection. */
  sharedBottom: number;
  /** Original fragments assigned to this row. */
  readonly rects: T[];
}
