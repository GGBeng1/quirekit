import type { Transaction } from "@quirekit/pm";
import type { QuireTransactionRenderImpact } from "./types";

/** Public metadata key for a feature's complete-transaction render declaration. */
export const QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY = "quirekit:transaction-render-impact";

const presentationOnly: QuireTransactionRenderImpact = Object.freeze({ kind: "presentation-only" });

/**
 * Declares render impact after the owner has finished its complete transaction.
 *
 * This promise covers every metadata change in this transaction, not subsequent
 * appended transactions. A command in an arbitrary shared chain cannot prove it;
 * owners adding unrelated work must clear the declaration. Actual document,
 * composition and live layout dependencies always require separate validation.
 *
 * @param transaction - Complete transaction whose feature changes are known.
 * @param impact - Owner declaration, or undefined to withdraw a previous promise.
 * @returns The same transaction for fluent command composition.
 */
export function setQuireTransactionRenderImpact<TransactionType extends Transaction>(
  transaction: TransactionType,
  impact: QuireTransactionRenderImpact | undefined
): TransactionType {
  return transaction.setMeta(QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY,
    impact?.kind === "presentation-only" ? presentationOnly : undefined);
}

/**
 * Reads a recognized declaration without deciding any backend's invalidation.
 *
 * @param transaction - Exact transaction to inspect, never an enclosing batch.
 * @returns Valid owner promise, or undefined for absent or unrecognized metadata.
 */
export function readQuireTransactionRenderImpact(
  transaction: Transaction
): QuireTransactionRenderImpact | undefined {
  const value: unknown = transaction.getMeta(QUIRE_TRANSACTION_RENDER_IMPACT_META_KEY);
  return value !== null && typeof value === "object" && "kind" in value
    && value.kind === "presentation-only" ? presentationOnly : undefined;
}
