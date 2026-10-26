import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuireLayoutBox, QuireLayoutContainer } from "../../../layout/engine/types";
import type { QuirePageBandStorySourceLayout } from "./types";

/**
 * Omits complete source-owned band paragraphs without moving surviving text.
 * @param source - Unmodified retained story source.
 * @param ranges - Canonical ranges selected by document semantics.
 * @returns Page-local source with matching paint, anchors and interaction descendants removed.
 */
export function omitPageBandRanges(source: QuirePageBandStorySourceLayout,
  ranges: readonly QuireDocumentRange[] | undefined): QuirePageBandStorySourceLayout {
  if (!ranges?.length) return source;
  const relevant = ranges.filter(range => range.from >= source.layout.range.from && range.to <= source.layout.range.to);
  if (!relevant.length) return source;
  /** @param range - Measured range. @returns Whether a semantic omission fully contains it. */
  const omitted = (range: QuireDocumentRange): boolean => relevant.some(item => range.from >= item.from && range.to <= item.to);
  /** @param box - Source subtree. @returns Surviving descendants with original page-band height and positions. */
  const prune = (box: QuireLayoutBox): QuireLayoutBox => "children" in box ? { ...box,
    children: (box.children as readonly QuireLayoutBox[]).filter(child => !omitted(child.range)).map(prune)
  } as QuireLayoutContainer : box;
  const anchors = source.anchors.filter(anchor => !omitted(anchor.range));
  const ids = new Set(anchors.map(anchor => anchor.sourceAnchorId));
  return { ...source, layout: prune(source.layout) as QuireLayoutContainer, anchors,
    sourceCapabilities: source.sourceCapabilities.filter(capability => ids.has(capability.sourceAnchorId)) };
}
