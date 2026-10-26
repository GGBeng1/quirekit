import { NodeSelection } from "@quirekit/pm";
import type { CreateHtmlDomMeasurementProviderOptions, HtmlMeasuredPosition } from "../types";
import { resolveHtmlLocalBlockBoundary } from "./boundary";
import { htmlTextblockOwner } from "../owner";
import { acceptHtmlCaretCandidate, isHtmlNodeInsideSurface, readHtmlCaretCandidate } from "./candidate";
import type { HtmlBlockHitGeometry } from "./types";

/**
 * Resolves DOM hits and gaps through one retained spatial ownership contract.
 * @param options - Browser, retained ownership, and mounted coordinate surface.
 * @param geometry - Current block geometry, reused by every point consumer.
 * @param left - Client x coordinate.
 * @param top - Client y coordinate.
 * @returns Owned local position, or null when no current owner can prove it.
 */
export function resolveHtmlPositionAtClientPoint(
  options: CreateHtmlDomMeasurementProviderOptions,
  geometry: HtmlBlockHitGeometry,
  left: number,
  top: number
): HtmlMeasuredPosition | null {
  const element = options.ownerDocument.elementFromPoint?.(left, top);
  if (element && !isHtmlNodeInsideSurface(options.surface, element)) return null;
  const owner = element ? options.documentView.ownerAtDOM(element) : null;
  if (owner?.destroyed) return null;

  // Direct atoms and zero-width widgets already have exact ownership. Do not
  // let a browser caret in adjacent prose replace their canonical source.
  if (owner && (owner.kind === "node" || owner.kind === "node-view")
    && !owner.mount?.contentDOM && owner.node.isBlock && owner.node.isAtom && NodeSelection.isSelectable(owner.node)) {
    return { pos: owner.range.from, inside: owner.range.from, descriptorId: owner.id,
      source: { ...owner.source, range: owner.range }, rootId: options.rootId, regionId: options.regionId, nodeSelection: true };
  }
  if (owner?.kind === "widget") return acceptHtmlCaretCandidate(options, { node: element!, offset: 0 });

  const textblock = htmlTextblockOwner(owner);
  const candidate = readHtmlCaretCandidate(options.ownerDocument, left, top);
  const structural = element && !textblock && (!owner || !!owner.mount?.contentDOM);
  if (!structural) {
    const accepted = acceptHtmlCaretCandidate(options, candidate, textblock, left);
    if (accepted) return accepted;
  }

  // A structural ancestor cannot choose a text position from its horizontal
  // midpoint. Resolve nearby leaves by y/x, scoped to any enclosing container.
  if (textblock?.mount?.dom.nodeType === 1) {
    const box = (textblock.mount.dom as Element).getBoundingClientRect();
    return resolveHtmlLocalBlockBoundary(options, {
      descriptor: textblock, rect: { x: box.left, y: box.top, width: box.width, height: box.height }
    }, left, top);
  }
  const scope = structural && owner && owner.kind !== "document" ? owner.range : undefined;
  const target = geometry.atPoint(left, top, scope);
  return target ? resolveHtmlLocalBlockBoundary(options, target, left, top) : null;
}
