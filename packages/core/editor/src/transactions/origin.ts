import type { Transaction } from "@quirekit/pm";

/** Stable metadata key carrying an explicitly declared transaction origin. */
export const QUIRE_TRANSACTION_ORIGIN_META_KEY =
  "quirekit:transaction-origin";

/** Origins shared by editor features that need deterministic bypass policy. */
export type QuireTransactionOrigin =
  | "human"
  | "ai"
  | "import"
  | "collaboration"
  | "history"
  | "decision"
  | "direct";

const QUIRE_TRANSACTION_ORIGINS = new Set<QuireTransactionOrigin>([
  "human",
  "ai",
  "import",
  "collaboration",
  "history",
  "decision",
  "direct"
]);

/**
 * Declares why one transaction is entering the root dispatch chain.
 *
 * @param transaction - Transaction receiving provenance metadata.
 * @param origin - Explicit editor or integration origin.
 * @returns The same transaction for fluent command composition.
 */
export function setQuireTransactionOrigin<
  TransactionType extends Transaction
>(
  transaction: TransactionType,
  origin: QuireTransactionOrigin
): TransactionType {
  transaction.setMeta(QUIRE_TRANSACTION_ORIGIN_META_KEY, origin);
  return transaction;
}

/**
 * Reads a validated origin from one transaction.
 *
 * @param transaction - Candidate root transaction.
 * @returns Declared origin, or undefined when absent or malformed.
 */
export function readQuireTransactionOrigin(
  transaction: Transaction
): QuireTransactionOrigin | undefined {
  const value = transaction.getMeta(QUIRE_TRANSACTION_ORIGIN_META_KEY);
  return QUIRE_TRANSACTION_ORIGINS.has(value as QuireTransactionOrigin)
    ? value as QuireTransactionOrigin
    : undefined;
}
