import type { QuireGlyphRunGlyphPlacement } from "@quirekit/renderer";
import type { QuireTextFragment } from "@quirekit/layout/text";
import { mapFragmentGlyphs } from "./command";

/** Logical source range represented by one glyph source cluster. */
interface GlyphSourceRange {
  /** Inclusive source offset in the fragment text. */
  readonly from: number;
  /** Exclusive source offset in the fragment text. */
  readonly to: number;
}

/**
 * Resolves the shaped glyph subset for a text segment.
 *
 * A style split can land inside a ligature, such as between `f` and `l` in
 * `fl`. A glyph whose source range extends outside the requested text segment
 * cannot be painted safely for that segment; carrying it would draw only the
 * segment text while preserving the whole ligature advance, visually dropping
 * the absorbed component. When the included glyph ranges do not cover the whole
 * segment, return no glyphs so the command falls back to native text.
 *
 * @param fragment - Text fragment being split.
 * @param startOffset - Segment start offset within the fragment text.
 * @param endOffset - Segment end offset within the fragment text.
 * @param left - Segment left edge within the fragment.
 * @returns Glyphs rebased to the segment, or an empty array for native text.
 */
export function resolveSegmentGlyphs(
  fragment: QuireTextFragment,
  startOffset: number,
  endOffset: number,
  left: number
): readonly QuireGlyphRunGlyphPlacement[] {
  const fragmentGlyphs = mapFragmentGlyphs(fragment);

  if (fragmentGlyphs.length === 0) {
    return [];
  }

  const sourceRanges = resolveGlyphSourceRanges(
    fragmentGlyphs,
    fragment.text.length
  );
  const includedGlyphs = fragmentGlyphs.filter((glyph) => {
    const sourceRange = sourceRanges.get(glyph.sourceCluster);

    return sourceRange !== undefined
      && sourceRange.from >= startOffset
      && sourceRange.to <= endOffset;
  });

  if (
    includedGlyphs.length === 0 ||
    !glyphRangesCoverSegment(includedGlyphs, sourceRanges, startOffset, endOffset)
  ) {
    return [];
  }

  return includedGlyphs.map((glyph) => ({
    ...glyph,
    sourceCluster: glyph.sourceCluster - startOffset,
    x: glyph.x - left
  }));
}

/**
 * Resolves source ranges for glyph clusters in a fragment.
 *
 * @param glyphs - Fragment glyph placements.
 * @param textLength - Source fragment text length.
 * @returns Source ranges keyed by glyph source cluster.
 */
function resolveGlyphSourceRanges(
  glyphs: readonly QuireGlyphRunGlyphPlacement[],
  textLength: number
): ReadonlyMap<number, GlyphSourceRange> {
  const starts = Array.from(new Set(
    glyphs
      .map((glyph) => normalizeGlyphSourceCluster(glyph.sourceCluster))
      .filter((sourceCluster): sourceCluster is number => sourceCluster !== null)
  ))
    .sort((first, second) => first - second);
  const ranges = new Map<number, GlyphSourceRange>();

  for (let index = 0; index < starts.length; index += 1) {
    const from = starts[index];

    if (from === undefined || from >= textLength) {
      continue;
    }

    const nextStart = starts[index + 1];
    const to = Math.min(nextStart ?? textLength, textLength);

    if (to > from) {
      ranges.set(from, { from, to });
    }
  }

  return ranges;
}

/**
 * Checks whether included glyph ranges cover every source offset in a segment.
 *
 * @param glyphs - Glyphs included in the segment.
 * @param sourceRanges - Full-fragment glyph source ranges.
 * @param startOffset - Segment start offset.
 * @param endOffset - Segment end offset.
 * @returns Whether the glyph subset fully covers the segment text.
 */
function glyphRangesCoverSegment(
  glyphs: readonly QuireGlyphRunGlyphPlacement[],
  sourceRanges: ReadonlyMap<number, GlyphSourceRange>,
  startOffset: number,
  endOffset: number
): boolean {
  let coveredTo = startOffset;
  const ranges = glyphs
    .map((glyph) => sourceRanges.get(glyph.sourceCluster))
    .filter((range): range is GlyphSourceRange => range !== undefined)
    .sort((first, second) => first.from - second.from);

  for (const range of ranges) {
    if (range.from > coveredTo) {
      return false;
    }

    coveredTo = Math.max(coveredTo, range.to);
    if (coveredTo >= endOffset) {
      return true;
    }
  }

  return coveredTo >= endOffset;
}

/**
 * Normalizes a glyph source cluster into a valid source offset.
 *
 * @param sourceCluster - Raw source cluster value.
 * @returns Integer source offset, or null when invalid.
 */
function normalizeGlyphSourceCluster(sourceCluster: number): number | null {
  if (!Number.isFinite(sourceCluster) || sourceCluster < 0) {
    return null;
  }

  return Math.trunc(sourceCluster);
}
