import type { HtmlDescriptor } from "../../descriptors";
import { HtmlDomMappingGapError } from "../../document";
import { resolveHtmlMeasuredPosition } from "../dom-point";
import { measureHtmlInlineEdges } from "../inline-boundary";
import { htmlTextblockOwner } from "../owner";
import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasuredPosition } from "../types";
import type { HtmlCaretCandidate, HtmlWebKitCaretDocument } from "./types";

/**
 * Reads a browser caret proposal without assuming that its DOM is editable.
 * @param document - Browser document providing modern or legacy caret APIs.
 * @param left - Client x coordinate.
 * @param top - Client y coordinate.
 * @returns Browser proposal, or null outside browser caret geometry.
 */
export function readHtmlCaretCandidate(document: Document, left: number, top: number): HtmlCaretCandidate | null {
  const modern = document.caretPositionFromPoint?.(left, top);
  if (modern) return { node: modern.offsetNode, offset: modern.offset };
  const legacy = (document as HtmlWebKitCaretDocument).caretRangeFromPoint?.(left, top);
  return legacy ? { node: legacy.startContainer, offset: legacy.startOffset } : null;
}

/**
 * Validates both retained ownership and the local textblock chosen by geometry.
 * @param options - Retained document and mounted surface.
 * @param candidate - Untrusted browser caret proposal.
 * @param block - Required textblock identity, when an element or geometry owns the hit.
 * @param left - Client x coordinate used to resolve opaque inline boundary proposals.
 * @returns Owned text position, never a structural ancestor's arbitrary boundary.
 */
export function acceptHtmlCaretCandidate(
  options: CreateHtmlDomMeasurementProviderOptions,
  candidate: HtmlCaretCandidate | null,
  block?: HtmlDescriptor | null,
  left?: number
): HtmlMeasuredPosition | null {
  if (!candidate || !isHtmlNodeInsideSurface(options.surface, candidate.node)) return null;
  const owner = options.documentView.ownerAtDOM(candidate.node);
  if (!owner || owner.destroyed) return null;
  const textblock = htmlTextblockOwner(owner);
  if ((!textblock && owner.kind !== "widget") || block && textblock !== block) return null;
  // A renderer's private label is not canonical text. Resolve its nearest outer
  // edge so browser proposals in atom-only paragraphs still yield a text caret.
  const edges = left === undefined ? null : measureHtmlInlineEdges(options, owner);
  if (edges) {
    const after = Math.abs(left! - edges[1].left) < Math.abs(left! - edges[0].left);
    return { pos: after ? owner.range.to : owner.range.from, inside: textblock!.range.from,
      descriptorId: owner.id, source: owner.source, rootId: options.rootId, regionId: options.regionId };
  }
  try {
    return resolveHtmlMeasuredPosition(options.documentView, options.rootId, options.regionId, candidate.node, candidate.offset, -1);
  } catch (error) {
    if (error instanceof HtmlDomMappingGapError) return null;
    throw error;
  }
}

/**
 * Checks ancestry without selectors or browser Range reads.
 * @param surface - Mounted content surface.
 * @param node - Proposed browser node.
 * @returns Whether the node belongs to the mounted surface.
 */
export function isHtmlNodeInsideSurface(surface: HTMLElement, node: Node): boolean {
  for (let current: Node | null = node; current; current = current.parentNode) {
    if (current === surface) return true;
  }
  return false;
}
