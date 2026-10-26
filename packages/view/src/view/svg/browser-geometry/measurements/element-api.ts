import type { QuirePoint } from "@quirekit/renderer";
import { clampSvgBrowserGeometryNumber } from "../math";
import type { SvgTextOffsetHit } from "../types";

/**
 * Resolves the nearest text offset for an SVG-root-space point.
 *
 * @param element - SVG text element to inspect.
 * @param point - Point in the owning SVG root's user coordinate system.
 * @returns Nearest source offset, or null when measurement fails.
 */
export function resolveSvgTextElementOffsetAtPoint(
  element: SVGTextContentElement,
  point: QuirePoint
): SvgTextOffsetHit | null {
  const count = tryReadSvgTextCharCount(element);

  if (count <= 0) {
    return null;
  }

  const index = tryReadSvgTextCharAtPoint(element, point, count);

  return index === null
    ? null
    : resolveNearestSvgTextBoundary(element, index, point.x);
}

/**
 * Resolves the browser-measured full text length for one SVG text element.
 *
 * @param element - SVG text element to measure.
 * @returns Rendered text length, or null when the browser cannot measure it.
 */
export function resolveSvgTextElementComputedTextLength(
  element: SVGTextContentElement
): number | null {
  try {
    return element.getComputedTextLength();
  } catch {
    return null;
  }
}

/**
 * Resolves the browser-measured substring length for one SVG text element.
 *
 * @param element - SVG text element to measure.
 * @param offset - First text offset in UTF-16 code units.
 * @param length - Number of UTF-16 code units to measure.
 * @returns Rendered substring length, or null when the browser cannot measure it.
 */
export function resolveSvgTextElementSubStringLength(
  element: SVGTextContentElement,
  offset: number,
  length: number
): number | null {
  try {
    return element.getSubStringLength(offset, length);
  } catch {
    return null;
  }
}

/**
 * Resolves the browser-measured x coordinate for one text offset.
 *
 * @param element - SVG text element to measure.
 * @param offset - Text offset in UTF-16 code units.
 * @returns Document-space x coordinate, or null when the browser cannot measure it.
 */
export function resolveSvgTextElementXAtOffset(
  element: SVGTextContentElement,
  offset: number
): number | null {
  const count = tryReadSvgTextCharCount(element);

  if (count <= 0) {
    return null;
  }

  try {
    if (offset <= 0) {
      return element.getStartPositionOfChar(0).x;
    }

    if (offset >= count) {
      return element.getEndPositionOfChar(count - 1).x;
    }

    return element.getStartPositionOfChar(offset).x;
  } catch {
    return null;
  }
}

/**
 * Resolves browser-measured x boundaries for one SVG text character.
 *
 * @param element - SVG text element to measure.
 * @param index - Text offset in UTF-16 code units.
 * @returns Start/end x coordinates, or null when the browser cannot measure them.
 */
export function resolveSvgTextElementCharXRange(
  element: SVGTextContentElement,
  index: number
): readonly [number, number] | null {
  try {
    return [
      element.getStartPositionOfChar(index).x,
      element.getEndPositionOfChar(index).x
    ];
  } catch {
    return null;
  }
}

/**
 * Reads how many characters a browser can measure on an SVG text element.
 *
 * @param element - SVG text element to inspect.
 * @returns Character count, or zero when unavailable.
 */
export function tryReadSvgTextCharCount(element: SVGTextContentElement): number {
  try {
    return element.getNumberOfChars();
  } catch {
    return 0;
  }
}

/**
 * Reads the browser-selected character nearest to a point.
 *
 * @param element - SVG text element to inspect.
 * @param point - SVG user-space point.
 * @param count - Number of measurable characters.
 * @returns Character index, or null when the browser reports a miss.
 */
function tryReadSvgTextCharAtPoint(
  element: SVGTextContentElement,
  point: QuirePoint,
  count: number
): number | null {
  try {
    const index = element.getCharNumAtPosition(point as DOMPoint);

    return index < 0
      ? null
      : clampSvgBrowserGeometryNumber(index, 0, count - 1);
  } catch {
    return null;
  }
}

/**
 * Resolves the closest caret boundary for a measured SVG character.
 *
 * @param element - SVG text element to inspect.
 * @param index - Browser-selected character index.
 * @param x - Pointer x coordinate in SVG user space.
 * @returns Closest source offset and distance, or null when measurement fails.
 */
function resolveNearestSvgTextBoundary(
  element: SVGTextContentElement,
  index: number,
  x: number
): SvgTextOffsetHit | null {
  const xRange = resolveSvgTextElementCharXRange(element, index);

  if (xRange === null) {
    return null;
  }

  const [start, end] = xRange;
  const startDistance = Math.abs(x - start);
  const endDistance = Math.abs(x - end);
  const afterCharacter = endDistance <= startDistance;

  return {
    offset: index + (afterCharacter ? 1 : 0),
    afterCharacter,
    distanceX: afterCharacter ? endDistance : startDistance
  };
}
