import { Transform, type Node as PMNode, type Transaction } from "@quirekit/pm";

/**
 * Combines the steps from multiple transactions into one transform.
 *
 * @param oldDoc - Document that the first transaction started from.
 * @param transactions - Transactions whose steps should be replayed.
 * @returns Transform containing all transaction steps.
 */
export function combineTransactionSteps(
  oldDoc: PMNode,
  transactions: readonly Transaction[]
): Transform {
  const transform = new Transform(oldDoc);

  for (const transaction of transactions) {
    for (const step of transaction.steps) {
      transform.step(step);
    }
  }

  return transform;
}
