import type { QuireTextFragment } from "@quirekit/layout/text";

/**
 * Compares paint and shaping fields before retaining a measured fragment.
 * Geometry and document-range translation remain owned by each cache caller.
 * @param previous - Retained fragment.
 * @param current - Freshly measured fragment.
 * @param absentIsEmpty - Whether absent mark arrays are equivalent to empty ones.
 * @returns Whether both fragments carry the same text style.
 */
export function textFragmentStylesEqual(previous: QuireTextFragment, current: QuireTextFragment, absentIsEmpty = false): boolean {
  return previous.font === current.font
    && previous.horizontalScale === current.horizontalScale
    && previous.paintOffset === current.paintOffset
    && previous.trailingSpacing === current.trailingSpacing
    && previous.letterSpacing === current.letterSpacing
    && previous.textColor === current.textColor
    && previous.textBackgroundColor === current.textBackgroundColor
    && previous.underline?.style === current.underline?.style
    && previous.underline?.color === current.underline?.color
    && previous.emphasisMark === current.emphasisMark
    && previous.hiddenText === current.hiddenText
    && previous.lineHeight === current.lineHeight
    && previous.direction === current.direction
    && stringArraysEqual(previous.glyphEffects, current.glyphEffects, absentIsEmpty)
    && stringArraysEqual(previous.textDecoration, current.textDecoration, absentIsEmpty)
    && stringArraysEqual(previous.marks, current.marks, absentIsEmpty);
}

/**
 * @param left - Retained optional values.
 * @param right - Current optional values.
 * @param absentIsEmpty - Caller-owned normalization policy.
 * @returns Whether the ordered values agree under that policy.
 */
function stringArraysEqual(left: readonly string[] | undefined, right: readonly string[] | undefined, absentIsEmpty: boolean): boolean {
  if (left === right) return true;
  if (!absentIsEmpty && (left === undefined || right === undefined)) return false;
  return (left?.length ?? 0) === (right?.length ?? 0) && (left ?? []).every((value, index) => value === right?.[index]);
}
