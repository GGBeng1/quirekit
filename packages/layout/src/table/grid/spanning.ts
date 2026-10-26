import type { QuireTableGridCellConstraint } from "../types";
import {
  normalizeIntrinsicWidth,
  sumWidths,
  transferTrackWidths
} from "./width-transfer";

/**
 * Satisfies spanning max-content ideals from safe out-of-span donor capacity.
 *
 * @param widths - Mutable widths after the single-column phase.
 * @param singleColumnIdeals - Per-track ideals established by direct cells.
 * @param singleColumnConstrained - Whether each track has a direct-cell bound.
 * @param constraints - All semantic cell constraints in source order.
 */
export function satisfySpanningCellIdeals(
  widths: number[],
  singleColumnIdeals: readonly number[],
  singleColumnConstrained: readonly boolean[],
  constraints: readonly QuireTableGridCellConstraint[]
): void {
  const spanning = constraints
    .filter((constraint) => constraint.columnSpan > 1)
    .map((constraint, sourceIndex) => ({ constraint, sourceIndex }))
    .sort((left, right) =>
      left.constraint.columnSpan - right.constraint.columnSpan ||
      left.sourceIndex - right.sourceIndex
    );

  for (const { constraint } of spanning) {
    const start = Math.max(0, constraint.startColumn);
    const end = Math.min(widths.length, start + constraint.columnSpan);
    if (start >= end) {
      continue;
    }

    const spanWidth = sumWidthRange(widths, start, end);
    const target = resolveConstraintTarget(constraint);
    const deficit = Math.max(0, target - spanWidth);
    if (deficit <= 0) {
      continue;
    }

    const donorSlack = widths.map((width, index) =>
      index < start || index >= end
        ? resolveSpanningDonorSlack(
            widths,
            index,
            width,
            singleColumnIdeals,
            singleColumnConstrained,
            constraints
          )
        : 0
    );
    clampDonorSlackBySpans(widths, donorSlack, constraints);
    const totalSlack = sumWidths(donorSlack);
    const transfer = Math.min(deficit, totalSlack);
    if (transfer <= 0) {
      continue;
    }

    const receiverWeights = widths.map((width, index) =>
      index >= start && index < end ? Math.max(1, width) : 0
    );
    transferTrackWidths(
      widths,
      receiverWeights,
      donorSlack,
      transfer,
      sumWidths(receiverWeights),
      totalSlack
    );
  }
}

/**
 * Resolves safe donor capacity without violating direct or spanning ideals.
 *
 * @param widths - Current working widths.
 * @param index - Candidate donor track index.
 * @param width - Current candidate width.
 * @param singleColumnIdeals - Per-track direct-cell ideals.
 * @param singleColumnConstrained - Whether the track has a direct-cell bound.
 * @param constraints - All semantic cell constraints.
 * @returns Width that may safely leave the candidate track.
 */
function resolveSpanningDonorSlack(
  widths: readonly number[],
  index: number,
  width: number,
  singleColumnIdeals: readonly number[],
  singleColumnConstrained: readonly boolean[],
  constraints: readonly QuireTableGridCellConstraint[]
): number {
  if (!singleColumnConstrained[index]) {
    return 0;
  }

  let slack = Math.max(0, width - (singleColumnIdeals[index] ?? width));
  for (const constraint of constraints) {
    if (constraint.columnSpan <= 1 || !constraintContainsColumn(constraint, index)) {
      continue;
    }

    const start = Math.max(0, constraint.startColumn);
    const end = Math.min(widths.length, start + constraint.columnSpan);
    const target = resolveConstraintTarget(constraint);
    slack = Math.min(slack, Math.max(0, sumWidthRange(widths, start, end) - target));
  }
  return slack;
}

/**
 * Clamps collective donor capacity to every spanning cell's current surplus.
 *
 * @param widths - Current working widths.
 * @param donorSlack - Mutable candidate donor capacities.
 * @param constraints - All semantic cell constraints.
 */
function clampDonorSlackBySpans(
  widths: readonly number[],
  donorSlack: number[],
  constraints: readonly QuireTableGridCellConstraint[]
): void {
  for (const constraint of constraints) {
    if (constraint.columnSpan <= 1) {
      continue;
    }

    const start = Math.max(0, constraint.startColumn);
    const end = Math.min(widths.length, start + constraint.columnSpan);
    const surplus = Math.max(
      0,
      sumWidthRange(widths, start, end) - resolveConstraintTarget(constraint)
    );
    const requested = sumWidthRange(donorSlack, start, end);
    if (requested <= surplus || requested <= 0) {
      continue;
    }

    const scale = surplus / requested;
    for (let index = start; index < end; index += 1) {
      donorSlack[index] = (donorSlack[index] ?? 0) * scale;
    }
  }
}

/**
 * Resolves the outer max-content target for one cell constraint.
 *
 * @param constraint - Semantic cell constraint.
 * @returns Positive target width in CSS pixels.
 */
function resolveConstraintTarget(
  constraint: QuireTableGridCellConstraint
): number {
  return Math.max(
    normalizeIntrinsicWidth(constraint.minWidth),
    normalizeIntrinsicWidth(constraint.maxWidth)
  );
}

/**
 * Checks whether a spanning constraint covers one physical column.
 *
 * @param constraint - Semantic cell constraint.
 * @param index - Physical column index.
 * @returns Whether the column belongs to the cell span.
 */
function constraintContainsColumn(
  constraint: QuireTableGridCellConstraint,
  index: number
): boolean {
  return index >= constraint.startColumn &&
    index < constraint.startColumn + constraint.columnSpan;
}

/**
 * Sums one half-open range of a width vector.
 *
 * @param widths - Width vector.
 * @param start - Inclusive start index.
 * @param end - Exclusive end index.
 * @returns Width sum for the requested range.
 */
function sumWidthRange(
  widths: readonly number[],
  start: number,
  end: number
): number {
  let total = 0;
  for (let index = start; index < end; index += 1) {
    total += widths[index] ?? 0;
  }
  return total;
}
