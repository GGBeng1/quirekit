import type { HtmlMeasuredDomPoint, HtmlMeasuredClientRect } from "./types";

/**
 * Measures one collapsed or expanded DOM Range into immutable client rectangles.
 *
 * @param ownerDocument - Browser document that creates the detached Range.
 * @param start - Owned start DOM point with measurement provenance.
 * @param end - Owned end DOM point with measurement provenance.
 * @param collapsed - Whether the returned geometry is a caret answer.
 * @returns Ordered client rectangles carrying the start-point provenance.
 */
export function measureHtmlDomRange(
  ownerDocument: Document,
  start: HtmlMeasuredDomPoint,
  end: HtmlMeasuredDomPoint,
  collapsed: boolean
): readonly HtmlMeasuredClientRect[] {
  const range = ownerDocument.createRange();
  range.setStart(start.node, start.offset);
  range.setEnd(end.node, end.offset);
  if (collapsed) {
    range.collapse(true);
  }

  const clientRects = Array.from(range.getClientRects());
  const rects = clientRects.length > 0
    ? clientRects
    : [range.getBoundingClientRect()].filter(hasUsefulHtmlRect);

  return rects.map((rect) => ({
    left: rect.left,
    right: rect.right,
    top: rect.top,
    bottom: rect.bottom,
    descriptorId: start.descriptorId,
    source: start.source,
    rootId: start.rootId,
    regionId: start.regionId
  }));
}

/**
 * Reports whether a DOM rectangle provides usable position or line geometry.
 *
 * @param rect - Browser rectangle to inspect.
 * @returns Whether at least one edge or dimension is finite and meaningful.
 */
function hasUsefulHtmlRect(rect: DOMRect): boolean {
  return [rect.left, rect.right, rect.top, rect.bottom].every(Number.isFinite) &&
    (rect.width > 0 || rect.height > 0 || rect.bottom !== rect.top);
}
