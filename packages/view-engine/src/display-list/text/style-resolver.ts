import type { QuireDocumentRange } from "@quirekit/renderer";
import type {
  QuireDecorationLine,
  QuireDecorationTextSpan
} from "../../decorations";
import type { QuireTextFragment } from "@quirekit/layout/text";

const emptyDecorationLines: readonly QuireDecorationLine[] = [];
const emptyDecorationTextSpans: readonly QuireDecorationTextSpan[] = [];

/** Final text style for a fragment segment. */
export interface ResolvedSegmentTextStyle {
  /** Fill style for the segment glyphs. */
  readonly fillStyle: string;
  /** Whether a persistent semantic visual replaces this segment's glyph paint. */
  readonly suppressTextPaint: boolean;
  /** Text-decoration lines to paint for this segment. */
  readonly textDecoration: readonly QuireDecorationLine[];
}

/**
 * Collects decoration text spans intersecting a fragment range.
 *
 * @param spans - Candidate text style spans.
 * @param range - Fragment range.
 * @returns Spans intersecting the range.
 */
export function collectIntersectingTextSpans(
  spans: readonly QuireDecorationTextSpan[],
  range: QuireDocumentRange
): readonly QuireDecorationTextSpan[] {
  let intersecting: QuireDecorationTextSpan[] | undefined;

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!;
    if (span.range.to <= range.from || span.range.from >= range.to) {
      continue;
    }

    if (intersecting === undefined) {
      intersecting = [];
    }
    intersecting.push(span);
  }

  return intersecting ?? emptyDecorationTextSpans;
}

/**
 * Resolves document-position boundaries where a fragment must be split.
 *
 * @param fragment - Text fragment to split.
 * @param spans - Decoration spans intersecting the fragment.
 * @param imePreeditRange - Optional IME preedit range in the speculative layout state.
 * @returns Sorted split boundaries.
 */
export function resolveFragmentTextStyleBoundaries(
  fragment: QuireTextFragment,
  spans: readonly QuireDecorationTextSpan[],
  imePreeditRange?: QuireDocumentRange | undefined
): readonly number[] {
  const boundaries = new Set<number>([fragment.range.from, fragment.range.to]);

  for (const span of spans) {
    boundaries.add(clampPosition(span.range.from, fragment.range));
    boundaries.add(clampPosition(span.range.to, fragment.range));
  }

  if (imePreeditRange !== undefined) {
    boundaries.add(clampPosition(imePreeditRange.from, fragment.range));
    boundaries.add(clampPosition(imePreeditRange.to, fragment.range));
  }

  return [...boundaries].sort((first, second) => first - second);
}

/**
 * Resolves final text style for one fragment segment.
 *
 * The mark-derived base fill and decoration are the starting point (the
 * document's own style); decoration spans then layer on top — text-decoration
 * lines accumulate, and a span only overrides the fill when it explicitly sets a
 * text color.
 *
 * @param range - Segment document range.
 * @param spans - Decoration spans intersecting the parent fragment.
 * @param defaultFillStyle - Base text fill style (the fragment's mark color).
 * @param baseDecoration - Base decoration lines from the fragment's marks.
 * @returns Fill style and text-decoration lines for the segment.
 */
export function resolveSegmentTextStyle(
  range: QuireDocumentRange,
  spans: readonly QuireDecorationTextSpan[],
  defaultFillStyle: string,
  baseDecoration: readonly QuireDecorationLine[] = emptyDecorationLines
): ResolvedSegmentTextStyle {
  let fillStyle = defaultFillStyle;
  let suppressTextPaint = false;
  let textDecoration: QuireDecorationLine[] | undefined;

  for (let index = 0; index < spans.length; index += 1) {
    const span = spans[index]!;
    if (span.range.to <= range.from || span.range.from >= range.to) {
      continue;
    }

    if (span.textColor !== undefined) {
      fillStyle = span.textColor;
    }
    if (span.suppressTextPaint === true) {
      suppressTextPaint = true;
    }

    const spanDecoration = span.textDecoration;
    if (spanDecoration !== undefined && spanDecoration.length > 0) {
      if (textDecoration === undefined) {
        textDecoration = baseDecoration.length === 0 ? [] : [...baseDecoration];
      }

      for (let decorationIndex = 0; decorationIndex < spanDecoration.length; decorationIndex += 1) {
        textDecoration.push(spanDecoration[decorationIndex]!);
      }
    }
  }

  return {
    fillStyle,
    suppressTextPaint,
    textDecoration: textDecoration ?? baseDecoration
  };
}

/**
 * Clamps a document position to a range.
 *
 * @param position - Position to clamp.
 * @param range - Inclusive range bounds.
 * @returns Clamped position.
 */
function clampPosition(
  position: number,
  range: QuireDocumentRange
): number {
  return Math.max(range.from, Math.min(range.to, position));
}
