import { doQuireDocumentRangesIntersect, doQuireRectsIntersect, intersectQuireRects } from "@quirekit/renderer";
import type { QuireDocumentRange, QuireRect } from "@quirekit/renderer";
import type { QuirePageBodyCaretLine, QuirePageBodyCaretScope } from "./types";

/**
 * Admits a measured line by page geometry and explicit source ownership.
 * @param scope - Page and repeated-header occurrences retained on that page.
 * @param rect - Measured line in document coordinates.
 * @param range - Canonical source interval represented by the line.
 * @returns Clipped line and accepted source intervals, or null outside this page.
 */
export function readQuirePageBodyCaretLine(
  scope: QuirePageBodyCaretScope,
  rect: QuireRect,
  range: QuireDocumentRange
): QuirePageBodyCaretLine | null {
  const clipped = intersectQuireRects(rect, scope.page.bodyRect);
  if (clipped === null) return null;
  const ranges = [scope.page.range];
  // Repeated header text deliberately keeps its original source positions.
  // Only an explicit occurrence covering this line may extend the page range.
  for (const target of scope.repeatedTargets) {
    if (doQuireRectsIntersect(target.rect, rect)
      && range.from >= target.range.from && range.to <= target.range.to) {
      ranges.push(target.range);
    }
  }
  return ranges.some((allowed) => doQuireDocumentRangesIntersect(allowed, range))
    ? { rect: clipped, ranges }
    : null;
}

/**
 * Checks a shaped endpoint against the admitted source intervals.
 * @param line - Page-admitted visual line and source ranges.
 * @param position - Exact retained caret position.
 * @returns Whether the position belongs to this page occurrence.
 */
export function isQuirePageBodyCaretPosition(line: QuirePageBodyCaretLine, position: number): boolean {
  return line.ranges.some((range) => position >= range.from && position <= range.to);
}
