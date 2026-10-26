import type {
  QuireDocumentRange,
  QuireGlyphRunGlyphPlacement
} from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { resolveSegmentGlyphs } from "./glyphs";

/** Paint data for a fragment segment. */
export interface TextFragmentSegment {
  /** Text content covered by this segment. */
  readonly text: string;
  /** Local x offset from the parent fragment left edge. */
  readonly localX: number;
  /** Segment width in canvas coordinate space. */
  readonly width: number;
  /** Optional glyph placement subset for glyph-run painting. */
  readonly glyphs: readonly QuireGlyphRunGlyphPlacement[];
}

/**
 * Resolves text, x offset, width, and glyph subset for a fragment segment.
 *
 * @param fragment - Text fragment being split.
 * @param range - Segment document range.
 * @returns Segment paint data.
 */
export function resolveFragmentSegment(
  fragment: QuireTextFragment,
  range: QuireDocumentRange
): TextFragmentSegment {
  const zeroWidthVisible = isZeroWidthVisibleFragmentRange(fragment, range);
  const startOffset = zeroWidthVisible ? 0 : range.from - fragment.range.from;
  const endOffset = zeroWidthVisible ? fragment.text.length : range.to - fragment.range.from;
  const start = zeroWidthVisible ? 0 : findFragmentLocalX(fragment, range.from);
  const end = zeroWidthVisible ? fragment.rect.width : findFragmentLocalX(fragment, range.to);
  const left = Math.min(start, end);
  const right = Math.max(start, end);
  const glyphs = resolveSegmentGlyphs(fragment, startOffset, endOffset, left);

  return {
    text: fragment.text.slice(startOffset, endOffset),
    localX: left,
    width: Math.max(1, right - left),
    glyphs
  };
}

/**
 * Checks whether a fragment has visible text attached to a collapsed document range.
 *
 * IME preedits use this shape: they occupy layout width and paint text,
 * but their document range is the insertion point they will commit into.
 *
 * @param fragment - Text fragment to inspect.
 * @param range - Segment range requested by the caller.
 * @returns Whether the range should paint the full visible fragment text.
 */
function isZeroWidthVisibleFragmentRange(
  fragment: QuireTextFragment,
  range: QuireDocumentRange
): boolean {
  return (
    range.from === range.to
    && fragment.range.from === fragment.range.to
    && range.from === fragment.range.from
    && fragment.text.length > 0
  );
}

/**
 * Finds local x for a document position within a fragment.
 *
 * @param fragment - Text fragment to inspect.
 * @param position - Document position to resolve.
 * @returns Local x coordinate.
 */
export function findFragmentLocalX(
  fragment: QuireTextFragment,
  position: number
): number {
  return fragment.caretStops.find((stop) => stop.position.pos === position)?.localX ??
    (position <= fragment.range.from ? 0 : fragment.rect.width);
}
