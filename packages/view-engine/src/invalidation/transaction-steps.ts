import type { Transaction } from "@quirekit/pm";

/** Pure text replace step metadata read from a ProseMirror transaction step. */
interface QuirePureTextReplaceStepInfo {
  /** Pre-transform document position where the replace starts. */
  readonly from: number;
  /** Pre-transform document position where the replace ends. */
  readonly to: number;
  /** Number of UTF-16 text positions inserted by the step. */
  readonly inserted: number;
  /** Number of UTF-16 text positions deleted by the step. */
  readonly deleted: number;
}

/**
 * Checks whether a replace step only inserts or deletes inline text.
 *
 * @param step - Candidate replace step.
 * @param previousDoc - Document before this step, used to classify deletions.
 * @returns Whether the replace can be treated as a local text edit.
 */
export function isQuirePureTextReplaceStep(
  step: unknown,
  previousDoc: unknown
): boolean {
  return deriveQuirePureTextReplaceStepInfo(step, previousDoc) !== undefined;
}

/**
 * Reads local text-edit metadata from a pure text replace step.
 *
 * @param step - Candidate replace step.
 * @param previousDoc - Document before this step, used to classify deletions.
 * @returns Text replace metadata, or undefined for structural steps.
 */
export function deriveQuirePureTextReplaceStepInfo(
  step: unknown,
  previousDoc: unknown
): QuirePureTextReplaceStepInfo | undefined {
  const stepType = readQuireStepType(step, readQuireStepJson(step));
  const from = readNumber((step as { readonly from?: unknown }).from);
  const to = readNumber((step as { readonly to?: unknown }).to);
  const slice = (step as { readonly slice?: unknown }).slice;

  if (
    stepType !== "replace" ||
    from === undefined ||
    to === undefined ||
    to < from ||
    slice === undefined
  ) {
    return undefined;
  }

  if (
    !isTextOnlySlice(slice) ||
    (from !== to && !isTextOnlyDeletedRange(previousDoc, from, to))
  ) {
    return undefined;
  }

  return {
    from,
    to,
    inserted: readNumber((slice as { readonly size?: unknown }).size) ?? 0,
    deleted: to - from
  };
}

/**
 * Reads the per-step previous documents retained by a transaction transform.
 *
 * @param transaction - Transaction whose transform docs should be inspected.
 * @returns Previous document list, or an empty list when unavailable.
 */
export function readQuireTransactionPreviousDocs(
  transaction: Transaction
): readonly unknown[] {
  const docs = (transaction as { readonly docs?: unknown }).docs;

  return Array.isArray(docs) ? docs : [];
}

/**
 * Reads a ProseMirror step JSON object without trusting custom step code.
 *
 * @param step - Step to serialize.
 * @returns Step JSON object, or an empty object on failure.
 */
export function readQuireStepJson(step: unknown): Record<string, unknown> {
  try {
    const json = (step as { readonly toJSON?: (() => unknown) | undefined }).toJSON?.();

    return isPlainObject(json) ? json : {};
  } catch {
    return {};
  }
}

/**
 * Reads a stable step type from JSON first, then the constructor name.
 *
 * @param step - Step to inspect.
 * @param json - Serialized step JSON.
 * @returns Step type string.
 */
export function readQuireStepType(
  step: unknown,
  json: Record<string, unknown>
): string {
  return typeof json.stepType === "string"
    ? json.stepType
    : (step as { readonly constructor?: { readonly name?: string } }).constructor?.name ??
        "Step";
}

/**
 * Checks whether a deleted document range contains text nodes only.
 *
 * @param doc - Document before the deletion.
 * @param from - Deleted range start.
 * @param to - Deleted range end.
 * @returns Whether the deleted range can be represented as text-only.
 */
function isTextOnlyDeletedRange(doc: unknown, from: number, to: number): boolean {
  const slice = (doc as {
    readonly slice?: ((from: number, to: number) => unknown) | undefined;
  }).slice?.(from, to);

  return slice !== undefined && isTextOnlySlice(slice);
}

/**
 * Checks whether a PM-like slice has only text content.
 *
 * @param slice - Slice-like value to inspect.
 * @returns Whether the slice is empty or contains only text nodes.
 */
function isTextOnlySlice(slice: unknown): boolean {
  const size = readNumber((slice as { readonly size?: unknown }).size);
  if (size === 0) {
    return true;
  }

  const openStart = readNumber((slice as { readonly openStart?: unknown }).openStart) ?? 0;
  const openEnd = readNumber((slice as { readonly openEnd?: unknown }).openEnd) ?? 0;
  if (openStart !== 0 || openEnd !== 0) {
    return false;
  }

  return isTextOnlyFragment((slice as { readonly content?: unknown }).content);
}

/**
 * Checks whether a PM-like fragment contains only text descendants.
 *
 * @param fragment - Fragment-like value to inspect.
 * @returns Whether the fragment has at least one text descendant and no non-text node.
 */
function isTextOnlyFragment(fragment: unknown): boolean {
  const size = readNumber((fragment as { readonly size?: unknown }).size);
  if (size === 0) {
    return true;
  }

  const candidate = fragment as {
    readonly descendants?: ((visitor: (node: unknown) => boolean | void) => void) | undefined;
  };
  if (candidate.descendants === undefined) {
    return false;
  }

  let sawText = false;
  let textOnly = true;
  candidate.descendants((node) => {
    if ((node as { readonly isText?: unknown }).isText === true) {
      sawText = true;
      return;
    }

    textOnly = false;
    return false;
  });

  return sawText && textOnly;
}

/**
 * Checks whether a value is a non-array object.
 *
 * @param value - Value to inspect.
 * @returns Whether the value is a plain object record.
 */
function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Reads a number from an unknown value.
 *
 * @param value - Value to inspect.
 * @returns Number when present.
 */
function readNumber(value: unknown): number | undefined {
  return typeof value === "number" ? value : undefined;
}
