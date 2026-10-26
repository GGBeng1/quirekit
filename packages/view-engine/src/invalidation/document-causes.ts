import type {
  DeriveQuireViewUpdatePatchOptions, QuireLayoutDirtyRange, QuireViewInvalidationCause
} from "./types";
import {
  isQuirePureTextReplaceStep,
  readQuireStepJson,
  readQuireStepType,
  readQuireTransactionPreviousDocs
} from "./transaction-steps";

/**
 * Derives canonical document causes from transaction steps and dirty identity.
 *
 * @param transactions - Transactions folded into one mounted update.
 * @param dirtyRange - Stronger explicit layout identity, when known.
 * @returns Ordered document patch flags.
 */
export function deriveDocumentInvalidationCauses(
  transactions: readonly NonNullable<DeriveQuireViewUpdatePatchOptions["transactions"]>[number][],
  dirtyRange: QuireLayoutDirtyRange | null | undefined
): readonly QuireViewInvalidationCause[] {
  if (dirtyRange?.reason === "table-structure") {
    return ["table-structure"];
  }
  if (dirtyRange?.reason === "floating-object-placement") {
    return ["floating-object-placement"];
  }
  if (dirtyRange?.reason === "table-style") {
    return ["table-style"];
  }
  if (dirtyRange?.reason === "font-epoch" || dirtyRange?.reason === "image-epoch") {
    return [dirtyRange.reason];
  }
  if (dirtyRange?.reason === "width-change") {
    return ["width-change"];
  }
  if (dirtyRange?.reason === "fallback") {
    return ["fallback"];
  }

  const causes: QuireViewInvalidationCause[] = [];

  for (const transaction of transactions) {
    if (!transaction.docChanged) {
      continue;
    }

    const previousDocs = readQuireTransactionPreviousDocs(transaction);
    for (let index = 0; index < transaction.steps.length; index += 1) {
      causes.push(classifyDocumentStep(transaction.steps[index], previousDocs[index]));
    }
  }

  return Array.from(new Set(causes));
}

/**
 * Classifies one document-changing step for retained render scheduling.
 *
 * @param step - ProseMirror step to inspect.
 * @param previousDoc - Document before this step, when available.
 * @returns Patch flag representing the lightest safe invalidation class.
 */
function classifyDocumentStep(
  step: unknown,
  previousDoc: unknown
): QuireViewInvalidationCause {
  const json = readQuireStepJson(step);
  const type = readQuireStepType(step, json);

  if (type === "addMark" || type === "removeMark" || type === "addNodeMark" || type === "removeNodeMark") {
    return "content";
  }

  if (type === "attr" || type === "docAttr") {
    return "content";
  }

  if (type === "replace") {
    return isQuirePureTextReplaceStep(step, previousDoc)
      ? "content"
      : "fallback";
  }

  return "fallback";
}
