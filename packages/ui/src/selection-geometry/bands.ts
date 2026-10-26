import type { QuireSelectionPaintRect, QuireSelectionTextBand, SelectionTextBandBuilder } from "./types";

/**
 * Groups measured text fragments by visual row without joining unselected horizontal gaps.
 * @param rects - Browser-ordered fragments from one text owner and one canonical range.
 * @returns Flat vertical bands retaining each original fragment and its provenance.
 */
export function groupQuireSelectionTextBands<T extends QuireSelectionPaintRect>(
  rects: readonly T[]
): readonly QuireSelectionTextBand<T>[] {
  const bands: SelectionTextBandBuilder<T>[] = [];
  for (const rect of rects) {
    if (![rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite)
      || rect.right <= rect.left || rect.bottom <= rect.top) continue;
    // A shared intersection, rather than the growing bounding box, prevents a
    // raised/lowered glyph from connecting the previous and next wrapped rows.
    let band: SelectionTextBandBuilder<T> | undefined;
    for (let index = bands.length - 1; index >= 0; index--) {
      const row = bands[index]!;
      if (rect.top < row.sharedBottom && rect.bottom > row.sharedTop) { band = row; break; }
    }
    if (!band) {
      bands.push({ top: rect.top, bottom: rect.bottom, sharedTop: rect.top, sharedBottom: rect.bottom, rects: [rect] });
      continue;
    }
    // Inner text and its padded inline surface share one band. A redundant inner
    // rectangle must not narrow the intersection that decides the next row.
    if (!band.rects.some(selected => contains(selected, rect))) {
      band.top = Math.min(band.top, rect.top);
      band.bottom = Math.max(band.bottom, rect.bottom);
      band.sharedTop = Math.max(band.sharedTop, rect.top);
      band.sharedBottom = Math.min(band.sharedBottom, rect.bottom);
    }
    band.rects.push(rect);
  }
  return bands;
}

/** @param outer - Selected text or inline surface. @param inner - Candidate fragment. @returns Whether its geometry is already enclosed. */
function contains(outer: QuireSelectionPaintRect, inner: QuireSelectionPaintRect): boolean {
  return inner.left >= outer.left - 0.01 && inner.right <= outer.right + 0.01
    && inner.top >= outer.top - 0.01 && inner.bottom <= outer.bottom + 0.01;
}
