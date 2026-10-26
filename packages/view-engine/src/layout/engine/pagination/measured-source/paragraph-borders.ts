import type { QuireLayoutBox } from "../../types";

/**
 * Reads the non-collapsing block extents already reserved by paragraph flow.
 * @param box - Source paragraph with physical border metadata.
 * @returns Top and bottom extents in flow CSS pixels.
 */
export function paragraphBorderBlockExtents(box: QuireLayoutBox): readonly [number, number] {
  const decoration = box.paragraphDecoration;
  const top = decoration?.firstFragment ? decoration.top : undefined;
  const bottom = decoration?.lastFragment ? decoration.bottom : undefined;
  return [top ? top.space + top.lineWidth : 0, bottom ? bottom.space + bottom.lineWidth : 0];
}

/**
 * Extends only edge line items, so pagination cannot collapse borders as margins.
 * Text provenance and wrapping remain unchanged; neighbouring item gaps consume
 * these envelopes rather than counting the same border a second time.
 * @param box - Source paragraph.
 * @param top - Text line top in flow space.
 * @param bottom - Text line bottom in flow space.
 * @param first - Whether this is the paragraph's first line.
 * @param last - Whether this is the paragraph's last line.
 * @returns Indivisible pagination envelope for the line.
 */
export function paragraphBorderLineEnvelope(
  box: QuireLayoutBox, top: number, bottom: number, first: boolean, last: boolean
): readonly [number, number] {
  const [start, end] = paragraphBorderBlockExtents(box);
  const text = box.inlineLayoutRect ?? box.rect;
  return [
    first && start > 0 ? Math.min(top, text.y - start) : top,
    last && end > 0 ? Math.max(bottom, text.y + text.height + end) : bottom
  ];
}

/** @param box - Source paragraph. @returns Small geometry dependency key for measured text reuse. */
export function paragraphBorderMeasurementKey(box: QuireLayoutBox): string {
  return paragraphBorderBlockExtents(box).join(":");
}
