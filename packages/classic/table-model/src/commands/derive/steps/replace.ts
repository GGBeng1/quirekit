import {
  Transform,
  type Node as PMNode,
  type Step,
  type Transaction
} from "@quirekit/pm";
import {
  declareWordRevisionOwnerReplacement,
  readWordRevisionOwnerReplacement
} from "@quirekit/classic-revision-contract";
import type { WordTableStepGranularity } from "./types";
import { writeWordTableNodeUpdate } from "./update";

/**
 * Writes a pure table transform result into a transaction.
 *
 * Minimal granularity keeps every untouched row and cell continuous in the
 * mapping, so remote edits, anchors, and history inside them survive. The
 * steps are first written on a scratch transform and must reproduce `next`
 * exactly; otherwise the table is replaced whole, never partially.
 *
 * @param tr - Transaction receiving the result.
 * @param tablePos - Absolute position before the table in `tr.doc`.
 * @param previous - Table currently at `tablePos`.
 * @param next - Pure transform result.
 * @param granularity - Requested step granularity.
 */
export function replaceWordTableNode(
  tr: Transaction,
  tablePos: number,
  previous: PMNode,
  next: PMNode,
  granularity: WordTableStepGranularity
): void {
  const steps = granularity === "minimal"
    ? createMinimalWordTableSteps(tr.doc, tablePos, previous, next)
    : null;
  if (steps === null) {
    tr.replaceWith(tablePos, tablePos + previous.nodeSize, next);
    return;
  }
  const firstStep = tr.steps.length;
  for (const step of steps) tr.step(step);
  // Revision admission reads these steps as the one table replacement they
  // realize. An earlier declaration in a command chain keeps its own range.
  if (
    steps.length > 0
    && readWordRevisionOwnerReplacement(tr) === undefined
  ) {
    declareWordRevisionOwnerReplacement(tr, { from: tablePos, firstStep, stepCount: steps.length });
  }
}

/**
 * Derives minimal steps that turn the table at `tablePos` into `next`.
 *
 * @param doc - Document containing `previous` at `tablePos`.
 * @param tablePos - Absolute position before the table.
 * @param previous - Table before the transform.
 * @param next - Required table after the transform.
 * @returns Verified steps, or null when the result needs a whole-table replacement.
 */
export function createMinimalWordTableSteps(
  doc: PMNode,
  tablePos: number,
  previous: PMNode,
  next: PMNode
): readonly Step[] | null {
  const transform = new Transform(doc);
  if (!writeWordTableNodeUpdate(transform, tablePos, previous, next)) return null;
  return transform.doc.nodeAt(tablePos)?.eq(next) === true
    ? transform.steps
    : null;
}
