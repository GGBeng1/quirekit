import type { Transaction } from "@quirekit/pm";
import type { QuireStoryCommandBoundary } from "./types";
import { isQuireSelectionInsideStoryCommandBoundary } from "./boundary";

/**
 * Checks whether an input transaction stays inside the active story.
 *
 * @param transaction - Candidate transaction produced by mounted input.
 * @param boundary - Live story boundary before the transaction.
 * @returns Whether every mutation and the resulting selection stay in scope.
 */
export function isQuireTransactionInsideStoryCommandBoundary(
  transaction: Transaction,
  boundary: QuireStoryCommandBoundary
): boolean {
  let from = boundary.from;
  let to = boundary.to;
  let selectionFrom = boundary.selectionFrom;
  let selectionTo = boundary.selectionTo;

  for (const step of transaction.steps) {
    const stepMap = step.getMap();
    let stepInsideBoundary = true;

    stepMap.forEach((oldStart, oldEnd) => {
      if (oldStart < from || oldEnd > to) {
        stepInsideBoundary = false;
      }
    });

    if (!stepInsideBoundary) {
      return false;
    }

    from = stepMap.map(from, -1);
    to = stepMap.map(to, 1);
    selectionFrom = stepMap.map(selectionFrom, -1);
    selectionTo = stepMap.map(selectionTo, 1);
  }

  const mappedBoundary = {
    ...boundary,
    from,
    to,
    selectionFrom,
    selectionTo
  };

  return isQuireSelectionInsideStoryCommandBoundary(
    mappedBoundary,
    transaction.selection.anchor,
    transaction.selection.head
  );
}
