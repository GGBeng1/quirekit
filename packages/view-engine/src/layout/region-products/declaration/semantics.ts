import type {
  QuireLayoutSemanticDescriptor,
  QuireLayoutSourceRef
} from "@quirekit/layout/identity";
import type {
  QuireRetainedRegionProductGap
} from "./types";
import type { QuireRetainedRegionCompilationContext } from "./shared";

/** Input for validating one exact retained semantic descriptor. */
interface ValidateQuireRetainedRegionSemanticsInput {
  /** Optional semantics attached to the owner. */
  readonly semantics?: QuireLayoutSemanticDescriptor | undefined;
  /** Exact source represented by the same owner. */
  readonly source?: QuireLayoutSourceRef | undefined;
  /** Region id used to scope a region-level gap. */
  readonly regionId?: string | undefined;
  /** Producer identity used by diagnostics. */
  readonly context: QuireRetainedRegionCompilationContext;
  /** Mutable production gap list. */
  readonly gaps: QuireRetainedRegionProductGap[];
}

/**
 * Validates one owner-scoped semantic product without inferring missing facts.
 *
 * @param input - Semantics, exact source, owner identity, and mutable gaps.
 * @returns Whether the semantic product is absent or completely valid.
 */
export function validateQuireRetainedRegionSemantics(
  input: ValidateQuireRetainedRegionSemanticsInput
): boolean {
  const semantics = input.semantics;

  if (semantics === undefined) {
    return true;
  }

  let valid = true;
  const report = (
    code: QuireRetainedRegionProductGap["code"],
    message: string
  ): void => {
    valid = false;
    input.gaps.push({
      code,
      message,
      producerId: input.context.producerId,
      sourceKind: input.context.sourceKind,
      ...(input.regionId === undefined ? {} : { regionId: input.regionId })
    });
  };

  if (isBlankSemanticText(semantics.role)) {
    report(
      "missing-semantic-role",
      "Retained semantic facts must declare a non-empty renderer-neutral role."
    );
  }
  if (semantics.label !== undefined && isBlankSemanticText(semantics.label)) {
    report(
      "blank-semantic-label",
      "Retained semantic labels must be omitted or contain non-whitespace text."
    );
  }
  if (
    semantics.description !== undefined
    && isBlankSemanticText(semantics.description)
  ) {
    report(
      "blank-semantic-description",
      "Retained semantic descriptions must be omitted or contain non-whitespace text."
    );
  }

  switch (semantics.search.kind) {
    case "source-text":
      if (input.source?.range === undefined) {
        report(
          "missing-semantic-source-range",
          "Source-text search semantics require an exact retained source range."
        );
      }
      break;
    case "metadata":
      if (isBlankSemanticText(semantics.search.text)) {
        report(
          "missing-semantic-search-text",
          "Metadata search semantics require non-whitespace searchable text."
        );
      }
      if (semantics.search.keywords?.some(isBlankSemanticText)) {
        report(
          "missing-semantic-search-keyword",
          "Metadata search keywords must contain non-whitespace text."
        );
      }
      break;
    case "excluded":
      if (isBlankSemanticText(semantics.search.reason)) {
        report(
          "missing-semantic-exclusion-reason",
          "Search exclusion semantics require a non-whitespace reason."
        );
      }
      break;
    default:
      return assertUnreachableSearchPolicy(semantics.search);
  }

  return valid;
}

/**
 * Reports whether human-facing semantic text is absent or whitespace-only.
 *
 * @param value - Text fact to inspect.
 * @returns Whether the text cannot be consumed as a declared semantic fact.
 */
function isBlankSemanticText(value: string | undefined): boolean {
  return value === undefined || value.trim().length === 0;
}

/**
 * Preserves exhaustiveness when the canonical search policy grows.
 *
 * @param policy - Search policy variant missing from the validator.
 * @returns Never because every unknown runtime policy is rejected.
 */
function assertUnreachableSearchPolicy(policy: never): never {
  throw new TypeError(`Unsupported retained semantic search policy: ${JSON.stringify(policy)}`);
}
