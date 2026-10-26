import type { QuireTableGridCellConstraint } from "../types";
import { satisfySpanningCellIdeals } from "./spanning";
import {
  normalizeIntrinsicWidth,
  reconcileWidthResidual,
  sumWidths,
  transferTrackWidths
} from "./width-transfer";

/**
 * Rebalances declared tracks toward intrinsic cell widths.
 *
 * The solver preserves the declared total width. Single-column cells first
 * establish independently measurable floors and ideals; spanning cells then
 * grow their combined tracks only by borrowing proven slack outside the span.
 *
 * @param baseWidths - Resolved declared track widths in source order.
 * @param constraints - Semantic cell constraints in stable source order.
 * @returns Rebalanced widths with the same total as the declared tracks.
 */
export function rebalanceQuireTableAutoFitWidths(
  baseWidths: readonly number[],
  constraints: readonly QuireTableGridCellConstraint[]
): readonly number[] {
  if (baseWidths.length === 0 || constraints.length === 0) {
    return baseWidths;
  }

  const minimums = [...baseWidths];
  const ideals = [...baseWidths];
  const constrained = new Array<boolean>(baseWidths.length).fill(false);

  // Single-column cells establish the first independently solvable track bounds.
  for (const constraint of constraints) {
    if (constraint.columnSpan !== 1) {
      continue;
    }

    const index = constraint.startColumn;
    if (index < 0 || index >= baseWidths.length) {
      continue;
    }

    const minimum = normalizeIntrinsicWidth(constraint.minWidth);
    const ideal = Math.max(minimum, normalizeIntrinsicWidth(constraint.maxWidth));
    if (!constrained[index]) {
      minimums[index] = minimum;
      ideals[index] = ideal;
      constrained[index] = true;
      continue;
    }

    minimums[index] = Math.max(minimums[index] ?? 1, minimum);
    ideals[index] = Math.max(ideals[index] ?? 1, ideal);
  }

  const widths = [...baseWidths];
  const deficits = widths.map((width, index) =>
    Math.max(0, (ideals[index] ?? width) - width)
  );
  const donorFloors = widths.map((width, index) => constrained[index]
    ? Math.max(minimums[index] ?? 1, Math.min(width, ideals[index] ?? width))
    : width
  );
  const donorSlack = widths.map((width, index) =>
    Math.max(0, width - (donorFloors[index] ?? width))
  );
  const totalDeficit = sumWidths(deficits);
  const totalSlack = sumWidths(donorSlack);
  const transfer = Math.min(totalDeficit, totalSlack);

  if (transfer > 0) {
    transferTrackWidths(
      widths,
      deficits,
      donorSlack,
      transfer,
      totalDeficit,
      totalSlack
    );
  }

  satisfySpanningCellIdeals(widths, ideals, constrained, constraints);
  return reconcileWidthResidual(widths, sumWidths(baseWidths));
}
