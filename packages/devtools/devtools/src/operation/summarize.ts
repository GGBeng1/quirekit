import { summarizeTransactionDetails } from "./detail";
import type { QuireDevtoolsOperationInput } from "../types";

/** Transaction shape needed by the devtools operation summarizer. */
export interface QuireDevtoolsTransactionLike {
  /** Transform steps included in the transaction. */
  readonly steps: readonly unknown[];
  /** Whether the transaction changed the document. */
  readonly docChanged: boolean;
  /** Whether the transaction explicitly changed selection. */
  readonly selectionSet: boolean;
  /** Whether stored marks were explicitly changed. */
  readonly storedMarksSet?: boolean | undefined;
  /**
   * Reads transaction metadata by key.
   *
   * @param key - Metadata key to read.
   * @returns Metadata value.
   */
  getMeta(key: string): unknown;
}

/**
 * Converts a ProseMirror transaction into operation metadata.
 *
 * @param transaction - Transaction to summarize.
 * @returns Operation metadata for the recorder.
 */
export function summarizeTransactionOperation(
  transaction: QuireDevtoolsTransactionLike,
  input: Pick<QuireDevtoolsOperationInput, "trigger"> = {}
): QuireDevtoolsOperationInput {
  const meta = readTransactionMeta(transaction);
  const details = summarizeTransactionDetails(transaction, meta);
  const source = resolveTransactionSource(transaction, details);

  return {
    source,
    stepCount: transaction.steps.length,
    docChanged: transaction.docChanged,
    selectionSet: transaction.selectionSet,
    metaKeys: Object.keys(meta),
    details,
    ...(input.trigger ? { trigger: input.trigger } : {})
  };
}

/**
 * Resolves a human-readable transaction source.
 *
 * @param transaction - Transaction whose metadata should be inspected.
 * @returns Source label.
 */
function resolveTransactionSource(
  transaction: QuireDevtoolsTransactionLike,
  details: NonNullable<QuireDevtoolsOperationInput["details"]>
): string {
  const source = transaction.getMeta("source");
  const uiEvent = transaction.getMeta("uiEvent");
  const composition = transaction.getMeta("composition");
  const pointer = transaction.getMeta("pointer");

  if (typeof source === "string" && source.length > 0) {
    return source;
  }

  if (typeof uiEvent === "string" && uiEvent.length > 0) {
    return uiEvent;
  }

  if (composition !== undefined) {
    return "composition";
  }

  if (pointer === true) {
    return "pointer";
  }

  const stepSource = inferStepSource(details);
  if (stepSource) {
    return stepSource;
  }

  if (transaction.selectionSet) {
    return "selection";
  }

  if (transaction.storedMarksSet === true) {
    return "storedMarks";
  }

  return "transaction";
}

/**
 * Infers an operation source from step summaries.
 *
 * @param details - Structured operation details.
 * @returns Inferred source when available.
 */
function inferStepSource(
  details: NonNullable<QuireDevtoolsOperationInput["details"]>
): string | undefined {
  const [step] = details.steps;

  if (!step || details.steps.length !== 1) {
    return details.steps.length > 1 ? "multi-step" : undefined;
  }

  if (step.type === "replace" && step.deletedSize === 0 && (step.insertedSize ?? 0) > 0) {
    return step.textPreview ? "insertText" : "insert";
  }

  if (step.type === "replace" && (step.deletedSize ?? 0) > 0 && (step.insertedSize ?? 0) === 0) {
    return "delete";
  }

  if (step.type === "replaceAround") {
    return "replaceAround";
  }

  if (step.type === "addMark" || step.type === "removeMark") {
    return step.type;
  }

  if (step.type === "attr" || step.type === "docAttr") {
    return "attribute";
  }

  return step.type === "replace" ? "replace" : undefined;
}

/**
 * Reads ProseMirror transaction metadata keys from the runtime object.
 *
 * @param transaction - Transaction whose private metadata bag is inspected.
 * @returns Runtime metadata record.
 */
function readTransactionMeta(
  transaction: QuireDevtoolsTransactionLike
): Record<string, unknown> {
  const candidate = (transaction as unknown as {
    readonly meta?: Record<string, unknown> | undefined;
  }).meta;

  return candidate ?? {};
}
