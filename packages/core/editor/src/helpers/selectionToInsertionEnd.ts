import {
  ReplaceAroundStep,
  ReplaceStep,
  Selection,
  type Transaction
} from "@quirekit/pm";

/**
 * Moves a transaction selection to the end of the last inserted replace step.
 *
 * @param tr - Transaction to update.
 * @param startLen - Step count before insertion started.
 * @param bias - Selection bias passed to `Selection.near`.
 */
export function selectionToInsertionEnd(
  tr: Transaction,
  startLen: number,
  bias: number
): void {
  const last = tr.steps.length - 1;

  if (last < startLen) {
    return;
  }

  const step = tr.steps[last];

  if (!(step instanceof ReplaceStep || step instanceof ReplaceAroundStep)) {
    return;
  }

  const map = tr.mapping.maps[last];
  if (!map) {
    return;
  }

  let end = 0;

  map.forEach((_from, _to, _newFrom, newTo) => {
    if (end === 0) {
      end = newTo;
    }
  });

  tr.setSelection(Selection.near(tr.doc.resolve(end), bias));
}
