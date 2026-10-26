import type {
  DeriveQuireViewUpdatePatchOptions,
  QuireViewUpdatePatch,
  QuireViewInvalidatedProduct,
  QuireViewInvalidationCause
} from "./types";
import { deriveDocumentInvalidationCauses } from "./document-causes";
import { deriveQuirePresentationTransactionCauses } from "./presentation";

/**
 * Derives patch flags and invalidated render lanes from an editor update.
 *
 * This is intentionally conservative: it does not yet attempt schema-level text
 * versus structure classification, but it gives every backend a shared,
 * diagnostics-visible envelope that future retained layout/display-list schedulers
 * can refine without changing render event contracts.
 *
 * @param options - Update reason, transactions, and optional dirty range.
 * @returns Typed patch describing why retained render products are invalidated.
 */
export function deriveQuireViewUpdatePatch(
  options: DeriveQuireViewUpdatePatchOptions
): QuireViewUpdatePatch {
  const transactions = options.transactions ?? [];
  const docChanged = transactions.some((transaction) => transaction.docChanged);
  const selectionChanged =
    options.reason === "selection"
    || transactions.some((transaction) => transaction.selectionSet);
  const compositionChanged =
    options.reason === "composition"
    || transactions.some((transaction) => transaction.getMeta("composition") !== undefined);
  const documentCauses = docChanged
    ? deriveDocumentInvalidationCauses(transactions, options.layoutDirtyRange)
    : [];
  const causes = derivePatchCauses({
    reason: options.reason,
    documentCauses,
    docChanged,
    selectionChanged,
    compositionChanged,
    presentationCauses: deriveQuirePresentationTransactionCauses(transactions, options.layoutDirtyRange)
  });
  const invalidatedProducts = deriveInvalidatedProducts(causes);

  return {
    ...(options.reason === undefined ? {} : { sourceReason: options.reason }),
    transactionCount: transactions.length,
    docChanged,
    selectionChanged,
    compositionChanged,
    causes,
    invalidatedProducts,
    layoutDirtyRange: options.layoutDirtyRange ?? null
  };
}

/**
 * Builds canonical invalidation causes from update evidence.
 *
 * @param input - Update reason and precomputed change booleans.
 * @returns Ordered patch flags.
 */
function derivePatchCauses(input: {
  /** Mounted backend update reason, when known. */
  readonly reason?: string | undefined;
  /** Document-specific causes derived from transaction steps and dirty identity. */
  readonly documentCauses: readonly QuireViewInvalidationCause[];
  /** Whether document content changed. */
  readonly docChanged: boolean;
  /** Whether selection changed. */
  readonly selectionChanged: boolean;
  /** Whether IME composition changed. */
  readonly compositionChanged: boolean;
  /** Complete-batch presentation proof or an explicit conservative rejection. */
  readonly presentationCauses: readonly QuireViewInvalidationCause[];
}): readonly QuireViewInvalidationCause[] {
  const causes: QuireViewInvalidationCause[] = [];

  if (input.docChanged) {
    causes.push(
      ...(input.documentCauses.length > 0
        ? input.documentCauses
        : ["fallback" as const])
    );
  }

  if (input.selectionChanged) {
    causes.push("selection");
  }

  if (input.compositionChanged) {
    causes.push("composition-preview");
  }

  causes.push(...input.presentationCauses);

  if (input.reason === "resize") {
    causes.push("width-change");
  }

  if (input.reason === "scroll" || input.reason === "fill") {
    causes.push("scroll");
  }

  if (input.reason === "hover") {
    causes.push("hover");
  }

  if (input.reason === "focus" || input.reason === "blur") {
    causes.push("focus");
  }

  if (input.reason === "font-epoch" || input.reason === "image-epoch" || input.reason === "image-paint") {
    causes.push(input.reason);
  }

  if (
    input.reason === "mode-change"
    || input.reason === "document-replace"
    || input.reason === "initial"
    || input.reason === "manual"
  ) {
    causes.push("fallback");
  }

  if (causes.length === 0 && input.reason !== undefined) {
    causes.push("fallback");
  }

  return dedupePatchValues(causes);
}

/**
 * Derives retained products from canonical invalidation causes.
 *
 * @param causes - Canonical invalidation causes.
 * @returns Ordered invalidated retained products.
 */
function deriveInvalidatedProducts(
  causes: readonly QuireViewInvalidationCause[]
): readonly QuireViewInvalidatedProduct[] {
  const products: QuireViewInvalidatedProduct[] = [];
  const hasLayoutInvalidation = causes.some((cause) =>
    cause === "content"
    || cause === "floating-object-placement"
    || cause === "table-structure"
    || cause === "table-style"
    || cause === "font-epoch"
    || cause === "image-epoch"
    || cause === "width-change"
    || cause === "fallback"
  );

  if (hasLayoutInvalidation) {
    products.push("layout", "content", "overlay");
  } else if (causes.includes("image-paint")) {
    products.push("content", "overlay");
  } else if (causes.length > 0) {
    products.push("overlay");
  }

  if (causes.includes("scroll") || causes.includes("width-change")) {
    products.push("viewport");
  }

  return dedupePatchValues(products);
}

/**
 * Removes repeated values while preserving insertion order.
 *
 * @param values - Values to deduplicate.
 * @returns Deduplicated values.
 */
function dedupePatchValues<Value extends string>(
  values: readonly Value[]
): readonly Value[] {
  return Array.from(new Set(values));
}
