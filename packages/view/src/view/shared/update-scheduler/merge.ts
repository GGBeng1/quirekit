import type { Transaction } from "@quirekit/pm";

/** Mounted update payload that may carry applied transactions for diagnostics. */
export interface MountedViewTransactionUpdate {
  /** Why this mounted view update was requested. */
  readonly reason?: string | undefined;
  /** Transactions that contributed to this mounted view update. */
  readonly transactions?: readonly Transaction[] | undefined;
  /** Optional transient preedit carried by a composition update. */
  readonly imePreedit?: unknown;
}

/**
 * Merges coalesced mounted-view transaction metadata while keeping latest state.
 *
 * @param pending - Update already waiting for the next frame.
 * @param next - Newer update requested before that frame runs.
 * @returns Newer update with both transaction lists retained, when present.
 */
export function mergeMountedViewUpdateTransactions<
  TUpdate extends MountedViewTransactionUpdate
>(pending: TUpdate, next: TUpdate): TUpdate {
  const transactions = mergeTransactionLists(pending.transactions, next.transactions);
  const reason = mergeMountedViewUpdateReasons(pending.reason, next.reason);
  const compositionUpdate = next.reason === "composition"
    ? next
    : pending.reason === "composition"
      ? pending
      : undefined;

  if (
    transactions === undefined &&
    reason === next.reason &&
    compositionUpdate === undefined
  ) {
    return next;
  }

  return {
    ...next,
    ...(transactions === undefined ? {} : { transactions }),
    ...(reason === next.reason ? {} : { reason }),
    // A transaction/resize can absorb a pending composition frame, but it has
    // no authority to clear the view-local preedit. Only the newer composition
    // request may replace it, including an explicit undefined clear payload.
    ...(compositionUpdate === undefined
      ? {}
      : { imePreedit: compositionUpdate.imePreedit })
  } as TUpdate;
}

/**
 * Merges coalesced update reasons so interaction renders keep the strongest
 * semantic label when they absorb earlier pending work.
 *
 * @param pending - Reason from an already pending update.
 * @param next - Reason from the newer update.
 * @returns Merged reason for diagnostics and render classification.
 */
function mergeMountedViewUpdateReasons(
  pending: string | undefined,
  next: string | undefined
): string | undefined {
  if (pending === "composition" || next === "composition") {
    return "composition";
  }
  if (pending === "transaction" || next === "transaction") {
    return "transaction";
  }

  return next ?? pending;
}

/**
 * Concatenates optional transaction lists without allocating for empty metadata.
 *
 * @param pending - Transactions from an already pending update.
 * @param next - Transactions from the newer update.
 * @returns Combined transactions, or undefined when neither update carries any.
 */
function mergeTransactionLists(
  pending: readonly Transaction[] | undefined,
  next: readonly Transaction[] | undefined
): readonly Transaction[] | undefined {
  if (pending === undefined || pending.length === 0) {
    return next;
  }
  if (next === undefined || next.length === 0) {
    return pending;
  }

  return [...pending, ...next];
}
