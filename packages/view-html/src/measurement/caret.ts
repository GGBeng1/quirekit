import { HtmlDomMappingGapError } from "../document";
import { htmlTextblockOwner } from "./owner";
import { measureHtmlDomRange } from "./range";
import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasuredClientRect, HtmlMeasuredDomPoint } from "./types";

/**
 * Uses an owned element box only when a collapsed Range has no line rectangle.
 *
 * @param options - Retained document and mounted surface inputs.
 * @param descriptorId - Descriptor whose element boundary is authoritative.
 * @param side - Preferred side of a structural boundary.
 * @param point - Original DOM boundary, when available.
 * @returns One text line, never the height of an ancestor container.
 */
export function resolveHtmlBoundaryRect(
  options: CreateHtmlDomMeasurementProviderOptions,
  descriptorId: string,
  side: number,
  point?: HtmlMeasuredDomPoint
): HtmlMeasuredClientRect {
  const descriptor = options.documentView.descriptorById(descriptorId);
  // A structural DOM point belongs to a boundary beside a child, never to the
  // full height of its container. Prefer that adjacent retained owner.
  const adjacent = point?.node.nodeType === 1
    ? point.node.childNodes[side < 0 ? point.offset - 1 : point.offset] ?? point.node.childNodes[point.offset - 1]
    : undefined;
  const neighbor = adjacent && options.documentView.ownerAtDOM(adjacent);
  let owner = neighbor ?? descriptor;
  while (owner && owner.mount?.dom.nodeType !== 1) owner = owner.parent ?? undefined;
  const element = owner?.mount?.contentDOM ?? owner?.mount?.dom;
  if (!owner || owner.destroyed || !element || element.nodeType !== 1) {
    throw new HtmlDomMappingGapError(
      `HTML measurement descriptor "${descriptorId}" has no measurable boundary.`
    );
  }
  const target = element as HTMLElement;
  const rect = target.getBoundingClientRect();
  const style = options.ownerDocument.defaultView?.getComputedStyle?.(target);
  const fontSize = Number.parseFloat(style?.fontSize ?? "") || 16;
  const lineHeight = Number.parseFloat(style?.lineHeight ?? "") || fontSize * 1.25;
  const height = Math.min(lineHeight, fontSize * 1.2);
  const paddingTop = Number.parseFloat(style?.paddingTop ?? "") || 0;
  const paddingLeft = Number.parseFloat(style?.paddingLeft ?? "") || 0;
  const paddingRight = Number.parseFloat(style?.paddingRight ?? "") || 0;
  const rtl = style?.direction === "rtl";
  const edge = rtl ? rect.right - paddingRight : rect.left + paddingLeft;
  const isText = (owner.kind === "node" || owner.kind === "node-view") && owner.node.isTextblock;
  const top = isText ? rect.top + paddingTop + Math.max(0, (lineHeight - height) / 2)
    : side < 0 ? Math.max(rect.top, rect.bottom - height) : rect.top;
  return {
    left: edge, right: edge, top, bottom: top + height,
    descriptorId: owner.id, source: owner.source,
    rootId: options.rootId, regionId: options.regionId
  };
}

/**
 * Resolves a collapsed position that belongs to display-none retained text.
 *
 * Hidden Word text remains in the canonical document, but normal HTML view
 * removes its browser geometry. The caret must therefore share the nearest
 * visible inline boundary instead of fabricating geometry inside the hidden
 * run. A previous visible boundary wins; the following boundary covers a
 * hidden run at paragraph start; an all-hidden paragraph falls back to its
 * retained block edge.
 *
 * @param options - Retained document and browser measurement inputs.
 * @param descriptorId - Descriptor whose collapsed Range had no geometry.
 * @param side - Preferred structural side for the final block fallback.
 * @param recordRangeRead - Records each real fallback Range read.
 * @returns The nearest measurable inline boundary, when one exists.
 */
export function resolveHtmlCollapsedPositionFallback(
  options: CreateHtmlDomMeasurementProviderOptions,
  descriptorId: string,
  side: number,
  recordRangeRead: () => void
): readonly HtmlMeasuredClientRect[] {
  const descriptor = options.documentView.descriptorById(descriptorId);
  if (!descriptor || descriptor.destroyed) {
    return [];
  }
  const textBlock = htmlTextblockOwner(descriptor);
  if (!textBlock) {
    return [];
  }
  const textOwners = options.documentView
    .descriptorsInRange(textBlock.range)
    .filter((candidate) => candidate.kind === "text" && !candidate.destroyed);
  const previous = textOwners
    .filter((candidate) => candidate.range.to <= descriptor.range.from)
    .reverse();
  const following = textOwners.filter(
    (candidate) => candidate.range.from >= descriptor.range.to
  );

  // Prefer the preceding visual boundary so every canonical position in one
  // collapsed hidden run co-locates with the same visible caret stop.
  for (const candidate of [...previous, ...following]) {
    const atEnd = candidate.range.to <= descriptor.range.from;
    const node = candidate.mount?.dom;
    if (!node) continue;
    const point: HtmlMeasuredDomPoint = { node, offset: atEnd ? (node.nodeValue ?? node.textContent ?? "").length : 0,
      descriptorId: candidate.id, source: candidate.source, rootId: options.rootId, regionId: options.regionId };
    const rects = measureHtmlDomRange(
      options.ownerDocument,
      point,
      point,
      true
    );
    recordRangeRead();
    if (rects.length > 0) {
      return rects;
    }
  }

  return [resolveHtmlBoundaryRect(options, textBlock.id, side)];
}
