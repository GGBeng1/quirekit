import type { QuireLayoutBox, QuireLayoutContainer } from "../../../layout/engine/types";

/** Tolerance for comparing line edges in CSS pixels. */
const epsilon = 0.01;

/**
 * Collects the bottoms of a story's lines, measured from the story top.
 *
 * Text lines are the places a note body may continue on the next fragment;
 * tables and other non-text boxes count as one indivisible line.
 *
 * @param layout - Measured story layout.
 * @returns Ascending line bottoms ending at the story height.
 */
export function collectQuireStoryLineBottoms(layout: QuireLayoutContainer): readonly number[] {
  const bottoms = new Set<number>();
  const visit = (box: QuireLayoutBox): void => {
    if (box.table === undefined && box.textFragments !== undefined && box.textFragments.length > 0) {
      for (const fragment of box.textFragments) bottoms.add(round(fragment.rect.y + fragment.rect.height - layout.rect.y));
      return;
    }
    const children = childBoxes(box);
    if (box.table === undefined && children.length > 0) {
      children.forEach(visit);
      return;
    }
    bottoms.add(round(box.rect.y + box.rect.height - layout.rect.y));
  };
  layout.children.forEach(visit);
  bottoms.add(round(layout.rect.height));
  return [...bottoms].filter((bottom) => bottom > 0 && bottom <= layout.rect.height + epsilon).sort((a, b) => a - b);
}

/**
 * Keeps only the lines of a story layout inside one vertical band.
 *
 * @param layout - Measured story layout.
 * @param offset - Band top, measured from the story top.
 * @param height - Band height.
 * @returns Story layout restricted to the band, with its rectangle set to the band.
 */
export function sliceQuireStoryLayout(
  layout: QuireLayoutContainer,
  offset: number,
  height: number
): QuireLayoutContainer {
  if (offset <= epsilon && height >= layout.rect.height - epsilon) {
    return layout;
  }
  const top = layout.rect.y + offset;
  const bottom = top + height;
  const children = sliceBoxes(layout.children, top, bottom);
  const range = children.length === 0 ? layout.range : {
    from: Math.min(...children.map((child) => child.range.from)),
    to: Math.max(...children.map((child) => child.range.to))
  };
  return { ...layout, range, rect: { ...layout.rect, y: top, height }, children };
}

/**
 * Restricts boxes to a vertical band.
 *
 * @param boxes - Boxes in story coordinates.
 * @param top - Band top.
 * @param bottom - Band bottom.
 * @returns Boxes overlapping the band, partially overlapping text reduced to its lines in the band.
 */
function sliceBoxes(boxes: readonly QuireLayoutBox[], top: number, bottom: number): QuireLayoutBox[] {
  const result: QuireLayoutBox[] = [];
  for (const box of boxes) {
    const boxBottom = box.rect.y + box.rect.height;
    if (boxBottom <= top + epsilon || box.rect.y >= bottom - epsilon) continue;
    if (box.rect.y >= top - epsilon && boxBottom <= bottom + epsilon) {
      result.push(box);
      continue;
    }
    if (box.table === undefined && box.textFragments !== undefined && box.textFragments.length > 0) {
      // A line belongs to the band holding its baseline, so raised markers stay with their line.
      const textFragments = box.textFragments.filter((fragment) =>
        fragment.baseline >= top - epsilon && fragment.baseline <= bottom + epsilon);
      if (textFragments.length === 0) continue;
      const y = Math.min(...textFragments.map((fragment) => fragment.rect.y));
      const end = Math.max(...textFragments.map((fragment) => fragment.rect.y + fragment.rect.height));
      // The part's range covers only its lines, so caret lookup finds the right page.
      const range = {
        from: Math.min(...textFragments.map((fragment) => fragment.range.from)),
        to: Math.max(...textFragments.map((fragment) => fragment.range.to))
      };
      const sliced: QuireLayoutBox = { ...box, range, rect: { ...box.rect, y, height: end - y }, textFragments };
      // Retained products such as a paragraph's first-line marker belong to the
      // part that shows the first line; a continued part must not repeat them.
      if (textFragments[0] !== box.textFragments[0]) {
        const { regionProducts: _products, ...continued } = sliced;
        result.push(continued);
      } else {
        result.push(sliced);
      }
      continue;
    }
    const nested = childBoxes(box);
    if (box.table === undefined && nested.length > 0) {
      const children = sliceBoxes(nested, top, bottom);
      if (children.length > 0) result.push({ ...box, children } as QuireLayoutContainer);
      continue;
    }
    result.push(box);
  }
  return result;
}

/**
 * Reads a box's child boxes when it is a container.
 *
 * @param box - Layout box.
 * @returns Child boxes, or an empty list for leaves.
 */
function childBoxes(box: QuireLayoutBox): readonly QuireLayoutBox[] {
  return "children" in box && Array.isArray(box.children) ? box.children as readonly QuireLayoutBox[] : [];
}

/**
 * Rounds a coordinate for stable comparisons.
 *
 * @param value - Coordinate in CSS pixels.
 * @returns Coordinate rounded to a thousandth of a pixel.
 */
function round(value: number): number {
  return Math.round(value * 1000) / 1000;
}
