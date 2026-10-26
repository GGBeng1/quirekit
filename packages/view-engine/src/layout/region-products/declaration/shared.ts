import type {
  QuireRetainedRegionProductDeclaration,
  QuireRetainedRegionProductGap
} from "./types";

/** Shared identity facts used while compiling a retained-region producer. */
export interface QuireRetainedRegionCompilationContext {
  /** Resolved producer id, when the declaration provided one. */
  readonly producerId?: string | undefined;
  /** Resolved ProseMirror node type name, when the declaration provided one. */
  readonly sourceKind?: string | undefined;
}

/**
 * Validates that an optional text fact is present and non-empty.
 *
 * @param value - Text fact to validate.
 * @param code - Gap code to report when the fact is missing.
 * @param message - Human-readable diagnostic message.
 * @param context - Producer identity facts used in diagnostics.
 * @param gaps - Mutable production gap list.
 * @returns Non-empty text value, or undefined when missing.
 */
export function validateQuireRetainedRegionTextFact(
  value: string | undefined,
  code: QuireRetainedRegionProductGap["code"],
  message: string,
  context: QuireRetainedRegionCompilationContext,
  gaps: QuireRetainedRegionProductGap[]
): string | undefined {
  if (!isBlankQuireRetainedRegionTextFact(value)) {
    return value;
  }

  gaps.push({
    code,
    message,
    producerId: context.producerId,
    sourceKind: context.sourceKind
  });
  return undefined;
}

/**
 * Creates compilation identity facts from an producer declaration.
 *
 * @param declaration - Producer declaration whose optional ids should be read.
 * @returns Compilation identity facts.
 */
export function createQuireRetainedRegionCompilationContext(
  declaration: QuireRetainedRegionProductDeclaration
): QuireRetainedRegionCompilationContext {
  return {
    producerId: declaration.producerId,
    sourceKind: declaration.sourceKind
  };
}

/**
 * Reports whether a string fact is missing or empty.
 *
 * @param value - Optional string value to inspect.
 * @returns Whether the value is absent or empty.
 */
export function isBlankQuireRetainedRegionTextFact(
  value: string | undefined
): boolean {
  return value === undefined || value.length === 0;
}
