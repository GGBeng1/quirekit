import type { QuireTextFragment } from "@quirekit/layout/text";
import type {
  QuireDocumentPosition,
  QuireDocumentRange,
  QuirePoint
} from "@quirekit/renderer";

/** Inputs for correcting a line-edge caret around a transparent inline owner. */
interface QuireTransparentInlineBoundaryOptions {
  /** Range of the editable textblock that owns the visual line. */
  readonly textblockRange: QuireDocumentRange;
  /** Text fragments projected directly onto the editable textblock. */
  readonly fragments: readonly QuireTextFragment[];
  /** Canvas point being mapped. */
  readonly point: QuirePoint;
  /** Nearest measured caret before transparent-boundary correction. */
  readonly position: QuireDocumentPosition;
}

/**
 * Moves an outer-line blank from inline content to the textblock boundary.
 *
 * Transparent inline nodes contribute opening and closing document tokens but
 * no visual width. When the first or last visible run is inside such a node,
 * clamping a blank click to that run leaves the selection inside the control.
 * A one-position gap between the run and textblock content edge identifies the
 * transparent token and restores the ordinary before/after-inline caret.
 *
 * @param options - Textblock geometry and initially measured caret.
 * @returns Corrected textblock-edge caret, or the original measured caret.
 */
export function resolveQuireTransparentInlineBoundaryPosition(
  options: QuireTransparentInlineBoundaryOptions
): QuireDocumentPosition {
  const lineFragments = options.fragments.filter((fragment) => (
    options.point.y >= fragment.rect.y
    && options.point.y <= fragment.rect.y + fragment.rect.height
  ));
  if (lineFragments.length === 0) return options.position;

  const lineLeft = Math.min(...lineFragments.map((fragment) => fragment.rect.x));
  const lineRight = Math.max(...lineFragments.map((fragment) => (
    fragment.rect.x + fragment.rect.width
  )));
  if (options.point.x >= lineLeft && options.point.x <= lineRight) {
    return options.position;
  }

  const lineRangeFrom = Math.min(...lineFragments.map((fragment) => (
    fragment.range.from
  )));
  const lineRangeTo = Math.max(...lineFragments.map((fragment) => (
    fragment.range.to
  )));
  const documentRangeFrom = Math.min(...options.fragments.map((fragment) => (
    fragment.range.from
  )));
  const documentRangeTo = Math.max(...options.fragments.map((fragment) => (
    fragment.range.to
  )));
  const contentFrom = options.textblockRange.from + 1;
  const contentTo = options.textblockRange.to - 1;

  if (
    options.position.pos === lineRangeFrom
    && lineRangeFrom === documentRangeFrom
    && lineRangeFrom === contentFrom + 1
  ) {
    return { pos: contentFrom, bias: 1 };
  }
  if (
    options.position.pos === lineRangeTo
    && lineRangeTo === documentRangeTo
    && lineRangeTo === contentTo - 1
  ) {
    return { pos: contentTo, bias: -1 };
  }

  return options.position;
}
