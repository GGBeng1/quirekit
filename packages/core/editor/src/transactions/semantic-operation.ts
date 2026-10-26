import type { Transaction } from "@quirekit/pm";

/** Stable metadata key carrying an exact owner semantic operation. */
export const QUIRE_SEMANTIC_OPERATION_META_KEY =
  "quirekit:semantic-operation";

/** Versioned feature operation declared by one public command. */
export interface QuireSemanticOperation {
  /** Stable generic feature owner. */
  readonly ownerId: string;
  /** Owner-defined operation family. */
  readonly kind: string;
  /** Positive operation contract version. */
  readonly version: number;
  /** Stable identity for this root transaction. */
  readonly operationId: string;
}

/**
 * Attaches one exact semantic operation to a root transaction.
 *
 * @param transaction - Transaction receiving command ownership metadata.
 * @param operation - Complete versioned operation descriptor.
 * @returns The same transaction for fluent command composition.
 */
export function setQuireSemanticOperation<TransactionType extends Transaction>(
  transaction: TransactionType,
  operation: QuireSemanticOperation
): TransactionType {
  transaction.setMeta(QUIRE_SEMANTIC_OPERATION_META_KEY, operation);
  return transaction;
}

/**
 * Reads and validates one exact semantic operation.
 *
 * @param transaction - Candidate root transaction.
 * @returns Frozen operation or undefined when metadata is absent or malformed.
 */
export function readQuireSemanticOperation(
  transaction: Transaction
): QuireSemanticOperation | undefined {
  const value = transaction.getMeta(QUIRE_SEMANTIC_OPERATION_META_KEY);
  if (value === null || typeof value !== "object" || Array.isArray(value)) {
    return undefined;
  }
  const record = value as Readonly<Record<string, unknown>>;
  if (
    !isNonEmptyString(record.ownerId)
    || !isNonEmptyString(record.kind)
    || !Number.isSafeInteger(record.version)
    || (record.version as number) <= 0
    || !isNonEmptyString(record.operationId)
  ) return undefined;
  return Object.freeze({
    ownerId: record.ownerId,
    kind: record.kind,
    version: record.version as number,
    operationId: record.operationId
  });
}

/** @param value - Candidate scalar. @returns Whether it is a stable string. */
function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}
