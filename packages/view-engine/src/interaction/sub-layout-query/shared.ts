import type {
  QuireDocumentRange,
  QuireRect
} from "@quirekit/renderer";
import type { QuireSubLayoutQueryProducts } from "../../layout";
import type {
  QuireSubLayoutCaretStop,
  QuireSubLayoutHitTarget,
  QuireSubLayoutSelectionRect
} from "./types";
import { readQuireSubLayoutCaretTextRectangle } from "./text-geometry";
import { getQuireSubLayoutQueryOwnerKey } from "../../layout/engine/sub-layout/text-identity";

/** Tolerance used when matching caret stops to a query-product line rectangle. */
const subLayoutLineTolerance = 0.5;

/**
 * Measures vertical distance to the accepted line band, including its leading.
 * @param rect - Canonical line rectangle in query coordinates.
 * @param y - Pointer coordinate in the same space.
 * @returns Zero inside the line, otherwise distance to its nearest edge.
 */
export function measureQuireSubLayoutLineDistanceY(rect: QuireRect, y: number): number {
  return Math.max(rect.y - y, y - rect.y - rect.height, 0);
}

/**
 * Restricts caret candidates to the selected target's source and occurrence.
 * @param stop - Candidate caret occurrence.
 * @param target - Hit target declaring the query scope.
 * @returns Whether source range and all available owner facts agree.
 */
export function isQuireSubLayoutCaretInsideTarget(
  stop: QuireSubLayoutCaretStop,
  target: QuireSubLayoutHitTarget
): boolean {
  return isQuireSubLayoutPositionInsideRange(stop.position.pos, target.range) &&
    (stop.queryOwner === undefined || target.queryOwner === undefined ||
      getQuireSubLayoutQueryOwnerKey(stop.queryOwner) ===
        getQuireSubLayoutQueryOwnerKey(target.queryOwner));
}

/**
 * Checks whether two rectangles represent the same visual line.
 *
 * @param first - First rectangle.
 * @param second - Second rectangle.
 * @returns Whether both rectangles share a line box.
 */
export function areQuireRectsOnSameLine(
  first: QuireRect,
  second: QuireRect
): boolean {
  return (
    Math.abs(first.y - second.y) <= subLayoutLineTolerance &&
    Math.abs(first.height - second.height) <= subLayoutLineTolerance
  );
}

/**
 * Measures vertical distance between rectangle centers.
 *
 * @param first - First rectangle.
 * @param second - Second rectangle.
 * @returns Absolute vertical center distance.
 */
export function measureQuireRectVerticalDistance(
  first: QuireRect,
  second: QuireRect
): number {
  return Math.abs(readQuireRectVerticalCenter(first) - readQuireRectVerticalCenter(second));
}

/**
 * Reads the vertical center of a rectangle.
 *
 * @param rect - Rectangle to inspect.
 * @returns Vertical center coordinate.
 */
function readQuireRectVerticalCenter(rect: QuireRect): number {
  return rect.y + rect.height / 2;
}

/**
 * Checks whether a document position is inside a closed target range.
 *
 * @param position - Document position to inspect.
 * @param range - Target range whose endpoints may both host caret stops.
 * @returns Whether the position belongs to the range.
 */
export function isQuireSubLayoutPositionInsideRange(
  position: number,
  range: QuireDocumentRange
): boolean {
  return position >= range.from && position <= range.to;
}

/**
 * Finds the selection rectangle that owns a caret stop's visual line.
 *
 * @param products - Query products whose selection rectangles should be inspected.
 * @param caretStop - Caret stop whose line rectangle is needed.
 * @returns Selection rectangle on the same line, or null when none matches.
 */
export function findQuireSubLayoutSelectionRectForCaretStop(
  products: QuireSubLayoutQueryProducts,
  caretStop: QuireSubLayoutCaretStop
): QuireSubLayoutSelectionRect | null {
  return readQuireSubLayoutCaretTextRectangle(products, caretStop);
}
