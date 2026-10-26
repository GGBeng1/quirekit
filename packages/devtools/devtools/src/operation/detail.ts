import { summarizeTransactionMeta } from "./meta";
import { summarizeTransactionStep } from "./step";
import type {
  QuireDevtoolsOperationChangedRangeSummary,
  QuireDevtoolsOperationDetails
} from "../types";

/** Structural selection shape needed for operation details. */
export interface QuireDevtoolsSelectionLike {
  /** Selection start position. */
  readonly from: number;
  /** Selection end position. */
  readonly to: number;
  /** Selection anchor position. */
  readonly anchor?: number | undefined;
  /** Selection head position. */
  readonly head?: number | undefined;
  /** Selection constructor. */
  readonly constructor?: { readonly name?: string | undefined } | undefined;
}

/** Structural transaction shape needed for operation details. */
export interface QuireDevtoolsTransactionDetailLike {
  /** Transform steps included in the transaction. */
  readonly steps: readonly unknown[];
  /** Starting document when any step has been applied. */
  readonly before?: { readonly nodeSize?: number | undefined } | undefined;
  /** Current transaction document. */
  readonly doc?: { readonly nodeSize?: number | undefined } | undefined;
  /** Final transaction selection. */
  readonly selection?: QuireDevtoolsSelectionLike | undefined;
  /** Whether stored marks were explicitly set. */
  readonly storedMarksSet?: boolean | undefined;
  /** Transaction timestamp. */
  readonly time?: number | undefined;
  /**
   * Computes the changed range.
   *
   * @returns Changed range when available.
   */
  changedRange?: (() => QuireDevtoolsOperationChangedRangeSummary | null) | undefined;
}

/**
 * Builds structured details for a transaction operation.
 *
 * @param transaction - Transaction to summarize.
 * @param meta - Transaction metadata record.
 * @returns Structured operation details.
 */
export function summarizeTransactionDetails(
  transaction: QuireDevtoolsTransactionDetailLike,
  meta: Record<string, unknown>
): QuireDevtoolsOperationDetails {
  const selection = transaction.selection;
  const changedRange = readChangedRange(transaction);

  return {
    ...(typeof transaction.time === "number" ? { transactionTime: transaction.time } : {}),
    ...(typeof transaction.before?.nodeSize === "number"
      ? { docBeforeSize: transaction.before.nodeSize }
      : {}),
    ...(typeof transaction.doc?.nodeSize === "number"
      ? { docAfterSize: transaction.doc.nodeSize }
      : {}),
    ...(typeof transaction.storedMarksSet === "boolean"
      ? { storedMarksSet: transaction.storedMarksSet }
      : {}),
    ...(selection ? summarizeSelection(selection) : {}),
    ...(changedRange ? { changedRange } : {}),
    meta: Object.entries(meta).map(([key, value]) => summarizeTransactionMeta(key, value)),
    steps: transaction.steps.map((step, index) => summarizeTransactionStep(step, index))
  };
}

/**
 * Summarizes final selection fields.
 *
 * @param selection - Selection to summarize.
 * @returns Selection fields for operation details.
 */
function summarizeSelection(
  selection: QuireDevtoolsSelectionLike
): Pick<
  QuireDevtoolsOperationDetails,
  "selectionAnchor" | "selectionFrom" | "selectionHead" | "selectionTo" | "selectionType"
> {
  return {
    selectionType: selection.constructor?.name ?? "Selection",
    selectionFrom: selection.from,
    selectionTo: selection.to,
    ...(typeof selection.anchor === "number" ? { selectionAnchor: selection.anchor } : {}),
    ...(typeof selection.head === "number" ? { selectionHead: selection.head } : {})
  };
}

/**
 * Reads the transaction changed range once.
 *
 * @param transaction - Transaction to inspect.
 * @returns Changed range when available.
 */
function readChangedRange(
  transaction: QuireDevtoolsTransactionDetailLike
): QuireDevtoolsOperationChangedRangeSummary | undefined {
  const range = transaction.changedRange?.() ?? undefined;

  return range === null ? undefined : range;
}
