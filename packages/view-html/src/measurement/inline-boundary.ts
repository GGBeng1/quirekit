import type { HtmlDescriptor } from "../descriptors";
import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasuredClientRect, HtmlMeasuredDomPoint } from "./types";

/**
 * Measures the two canonical caret stops of an opaque inline owner.
 * @param options - Retained ownership and browser geometry authority.
 * @param owner - Candidate owner; private renderer descendants are never text stops.
 * @returns Before/after edges in client CSS coordinates, or null for other owners.
 */
export function measureHtmlInlineEdges(
  options: CreateHtmlDomMeasurementProviderOptions,
  owner: HtmlDescriptor | undefined
): readonly [HtmlMeasuredClientRect, HtmlMeasuredClientRect] | null {
  if (!owner || owner.destroyed || (owner.kind !== "node" && owner.kind !== "node-view")
    || !owner.node.isInline || owner.mount?.contentDOM || owner.mount?.dom.nodeType !== 1) return null;
  const element = owner.mount.dom as Element;
  const box = element.getBoundingClientRect();
  if (box.width <= 0 || box.height <= 0) return null;
  const rtl = options.ownerDocument.defaultView?.getComputedStyle(element).direction === "rtl";
  /** @param left - Client x boundary. @returns Owned, zero-width caret geometry. */
  const edge = (left: number): HtmlMeasuredClientRect => ({ left, right: left, top: box.top, bottom: box.bottom,
    descriptorId: owner.id, source: owner.source, rootId: options.rootId, regionId: options.regionId });
  return [edge(rtl ? box.right : box.left), edge(rtl ? box.left : box.right)];
}

/**
 * Anchors an empty collapsed Range to its adjacent opaque inline object.
 * @param options - Retained ownership and browser geometry authority.
 * @param point - Canonical boundary mapped to its containing content DOM.
 * @param side - Preferred neighbouring owner at a shared boundary.
 * @returns One object-edge rectangle, or null when ordinary text/block fallback owns the stop.
 */
export function measureHtmlAdjacentInlineEdge(
  options: CreateHtmlDomMeasurementProviderOptions,
  point: HtmlMeasuredDomPoint,
  side: number
): readonly HtmlMeasuredClientRect[] | null {
  if (point.node.nodeType !== 1) return null;
  for (const after of side < 0 ? [true, false] : [false, true]) {
    const adjacent = point.node.childNodes[point.offset - (after ? 1 : 0)];
    if (!adjacent) continue;
    const edges = measureHtmlInlineEdges(options, options.documentView.ownerAtDOM(adjacent));
    if (edges) return [edges[after ? 1 : 0]];
  }
  return null;
}
