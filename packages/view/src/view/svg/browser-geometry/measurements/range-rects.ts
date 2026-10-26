import { clampSvgBrowserGeometryNumber } from "../math";
import type { SvgTextMeasurement } from "../types";
import {
  resolveSvgTextElementCharXRange,
  resolveSvgTextElementXAtOffset,
  tryReadSvgTextCharCount
} from "./element-api";
import type { SvgTextMeasurementRect } from "./types";

const svgSelectionRectMergeTolerance = 0.5;

/**
 * Resolves browser-measured visual rectangles for a text range.
 *
 * SVG text offsets can be visually non-monotonic for BiDi text. A logical range
 * therefore has to be decomposed into per-character visual boxes and merged in
 * visual order instead of using one `fromX..toX` span.
 *
 * @param element - SVG text element to measure.
 * @param command - Text command backing the element.
 * @param fromOffset - Inclusive source offset in the command text.
 * @param toOffset - Exclusive source offset in the command text.
 * @returns Visual rectangles in document coordinates, or null when unavailable.
 */
export function resolveSvgTextElementRangeRects(
  element: SVGTextContentElement,
  command: SvgTextMeasurement["command"],
  fromOffset: number,
  toOffset: number
): readonly SvgTextMeasurementRect[] | null {
  const count = tryReadSvgTextCharCount(element);

  if (count <= 0) {
    return null;
  }

  const from = clampSvgBrowserGeometryNumber(Math.trunc(fromOffset), 0, count);
  const to = clampSvgBrowserGeometryNumber(Math.trunc(toOffset), 0, count);

  if (from >= to) {
    return [];
  }

  const rects: SvgTextMeasurementRect[] = [];

  for (let index = from; index < to; index += 1) {
    const rect = resolveSvgTextElementCharRect(element, command, index);

    if (rect && rect.width > 0) {
      rects.push(rect);
    }
  }

  return rects.length === 0 ? null : mergeSvgTextSelectionRects(rects);
}

/**
 * Resolves one character's visual rectangle from browser SVG text APIs.
 *
 * @param element - SVG text element to measure.
 * @param command - Text command backing the element.
 * @param index - Character index to measure.
 * @returns Character rectangle, or null when measurement fails.
 */
function resolveSvgTextElementCharRect(
  element: SVGTextContentElement,
  command: SvgTextMeasurement["command"],
  index: number
): SvgTextMeasurementRect | null {
  const xRange = resolveSvgTextElementCharXRange(element, index);

  if (xRange === null) {
    return null;
  }

  const [start, end] = xRange;
  const width = Math.abs(end - start);

  if (width === 0) {
    return resolveSvgTextElementCollapsedCharRect(
      element,
      command,
      index,
      start
    );
  }

  return {
    x: Math.min(start, end),
    y: command.rect.y,
    width,
    height: command.rect.height
  };
}

/**
 * Synthesizes a visual rect for a collapsed SVG character box.
 *
 * Browser SVG APIs can report zero-width boxes for source characters absorbed
 * into a ligature, such as the `l` in `fl`. Dropping that box leaves holes in
 * QuireKit's overlay selection. Combining marks intentionally remain attached
 * to their base glyph, so they stay collapsed instead of borrowing width from a
 * neighbour.
 *
 * @param element - SVG text element to measure.
 * @param command - Text command backing the element.
 * @param index - Character index with a collapsed browser box.
 * @param collapsedX - Browser-reported x coordinate for the collapsed box.
 * @returns Synthesized rectangle, or null when no safe neighbour exists.
 */
function resolveSvgTextElementCollapsedCharRect(
  element: SVGTextContentElement,
  command: SvgTextMeasurement["command"],
  index: number,
  collapsedX: number
): SvgTextMeasurementRect | null {
  if (isCombiningMark(command.text.slice(index, index + 1))) {
    return null;
  }

  const nextBoundary = resolveSvgTextElementXAtOffset(element, index + 1);
  if (nextBoundary !== null && nextBoundary !== collapsedX) {
    return {
      x: Math.min(collapsedX, nextBoundary),
      y: command.rect.y,
      width: Math.abs(nextBoundary - collapsedX),
      height: command.rect.height
    };
  }

  const previousBoundary = resolveSvgTextElementXAtOffset(element, index);
  if (previousBoundary !== null && previousBoundary !== collapsedX) {
    return {
      x: Math.min(previousBoundary, collapsedX),
      y: command.rect.y,
      width: Math.abs(collapsedX - previousBoundary),
      height: command.rect.height
    };
  }

  return null;
}

/**
 * Checks whether a text slice is only a Unicode combining mark.
 *
 * @param text - Source text slice.
 * @returns Whether the slice is a mark that should not own selection width.
 */
function isCombiningMark(text: string): boolean {
  return /^\p{Mark}$/u.test(text);
}

/**
 * Merges adjacent visual character boxes into selection rectangles.
 *
 * @param rects - Character boxes to merge.
 * @returns Left-to-right merged selection rectangles.
 */
function mergeSvgTextSelectionRects(
  rects: readonly SvgTextMeasurementRect[]
): readonly SvgTextMeasurementRect[] {
  const sortedRects = [...rects].sort((a, b) => a.x - b.x);
  const mergedRects: SvgTextMeasurementRect[] = [];

  for (const rect of sortedRects) {
    const last = mergedRects.at(-1);

    if (
      last &&
      rect.y === last.y &&
      rect.height === last.height &&
      rect.x <= last.x + last.width + svgSelectionRectMergeTolerance
    ) {
      mergedRects[mergedRects.length - 1] = {
        ...last,
        width: Math.max(last.x + last.width, rect.x + rect.width) - last.x
      };
      continue;
    }

    mergedRects.push(rect);
  }

  return mergedRects;
}
