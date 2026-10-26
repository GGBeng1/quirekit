import type { Transaction } from "@quirekit/pm";
import { setQuireSemanticOperation } from "../transactions";

/** Generic owner emitted by schema-level list commands. */
export const QUIRE_LIST_CONTAINER_OPERATION_OWNER =
  "quirekit.list-containers";

/** Public list command families understood by feature bridges. */
export type QuireListContainerOperationKind =
  | "wrap"
  | "lift"
  | "indent"
  | "outdent"
  | "item-insert"
  | "item-delete"
  | "kind-change";

/**
 * Declares one exact schema-level list operation before dispatch.
 *
 * @param transaction - Root list command transaction.
 * @param kind - Exact public command family.
 * @returns The same transaction.
 */
export function setListContainerSemanticOperation<
  TransactionType extends Transaction
>(
  transaction: TransactionType,
  kind: QuireListContainerOperationKind
): TransactionType {
  return setQuireSemanticOperation(transaction, {
    ownerId: QUIRE_LIST_CONTAINER_OPERATION_OWNER,
    kind,
    version: 1,
    operationId: [
      QUIRE_LIST_CONTAINER_OPERATION_OWNER,
      kind,
      transaction.time,
      transaction.steps.length
    ].join(":")
  });
}
