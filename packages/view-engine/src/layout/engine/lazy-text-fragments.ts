import type { QuireDocumentRange } from "@quirekit/renderer";
import {
  cloneQuireTextFragmentWithLazyCaretStops,
  type QuireTextFragment
} from "@quirekit/layout/text";
import type { QuireLayoutBox } from "./types";
import { markQuireTextFragmentsSortedByLineTop } from "@quirekit/layout/text";

/** Metadata for a layout box whose text fragments are shifted lazily. */
export interface QuireLazyShiftedTextFragments {
  /** Retained source fragments before the accumulated shift was applied. */
  readonly sourceFragments: readonly QuireTextFragment[];
  /** Accumulated vertical shift from source-flow coordinates to the current box. */
  readonly dy: number;
  /** Accumulated document-position shift from source ranges to current ranges. */
  readonly rangeDelta: number;
}

/** Non-enumerable layout-box slot used to avoid opening lazy text fragments. */
export const quireLazyShiftedTextFragmentsKey: unique symbol =
  Symbol("quireLazyShiftedTextFragments");

/**
 * Attaches lazy shifted text-fragment metadata to a layout box.
 *
 * @param box - Layout box that owns the lazy text fragments.
 * @param metadata - Source fragments and accumulated shift metadata.
 * @returns Nothing.
 */
export function attachQuireLazyShiftedTextFragments(
  box: QuireLayoutBox,
  metadata: QuireLazyShiftedTextFragments
): void {
  Object.defineProperty(box, quireLazyShiftedTextFragmentsKey, {
    value: metadata,
    enumerable: false,
    configurable: true
  });
}

/**
 * Reads lazy shifted text-fragment metadata from a layout box.
 *
 * @param box - Layout box to inspect.
 * @returns Lazy shifted metadata, or undefined when the box is eager.
 */
export function readQuireLazyShiftedTextFragments(
  box: QuireLayoutBox
): QuireLazyShiftedTextFragments | undefined {
  return (box as {
    readonly [quireLazyShiftedTextFragmentsKey]?:
      | QuireLazyShiftedTextFragments
      | undefined;
  })[quireLazyShiftedTextFragmentsKey];
}

/**
 * Resolves source fragments for a box without opening a lazy getter when present.
 *
 * @param box - Layout box to inspect.
 * @returns Source fragments and accumulated shift metadata, or undefined.
 */
export function resolveQuireLazyShiftedTextFragmentSource(
  box: QuireLayoutBox
): QuireLazyShiftedTextFragments | undefined {
  const metadata = readQuireLazyShiftedTextFragments(box);
  if (metadata !== undefined) {
    return metadata;
  }

  const sourceFragments = box.textFragments;
  return sourceFragments === undefined
    ? undefined
    : { sourceFragments, dy: 0, rangeDelta: 0 };
}

/**
 * Materializes all shifted text fragments for a lazy box.
 *
 * @param metadata - Source fragments and accumulated shift metadata.
 * @returns Shifted text fragments in current box coordinates.
 */
export function materializeQuireLazyShiftedTextFragments(
  metadata: QuireLazyShiftedTextFragments
): readonly QuireTextFragment[] {
  return markQuireTextFragmentsSortedByLineTop(metadata.sourceFragments.map((fragment) =>
    shiftQuireTextFragment(fragment, metadata.dy, metadata.rangeDelta)
  ));
}

/**
 * Shifts one text fragment by vertical and document-position deltas.
 *
 * @param fragment - Source text fragment.
 * @param dy - Vertical offset to add.
 * @param rangeDelta - Document offset to add.
 * @returns Shifted text fragment.
 */
export function shiftQuireTextFragment(
  fragment: QuireTextFragment,
  dy: number,
  rangeDelta: number
): QuireTextFragment {
  return cloneQuireTextFragmentWithLazyCaretStops({
    source: fragment,
    id: fragment.id,
    range: shiftQuireDocumentRange(fragment.range, rangeDelta),
    rect: dy === 0
      ? fragment.rect
      : {
          ...fragment.rect,
          y: fragment.rect.y + dy
        },
    baseline: fragment.baseline + dy,
    caretStopRangeDelta: rangeDelta
  });
}

/**
 * Shifts a document range by a fixed delta.
 *
 * @param range - Range to shift.
 * @param delta - Document offset to add.
 * @returns Shifted document range.
 */
export function shiftQuireDocumentRange(
  range: QuireDocumentRange,
  delta: number
): QuireDocumentRange {
  if (delta === 0) {
    return range;
  }

  return {
    from: range.from + delta,
    to: range.to + delta
  };
}
