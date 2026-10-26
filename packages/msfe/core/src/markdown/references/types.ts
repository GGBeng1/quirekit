import type { MarkdownReference } from "../types";

/** Minimal canonical input needed by the immutable definition collector. */
export interface ReferenceSource {
  /** Reads an exact source interval without serializing the whole document. */
  sliceDoc(from: number, to: number): string;
}

/** Immutable ordered definition summary, with no source/tree or parent ownership. */
export interface ReferenceSummary {
  /** Number of definitions, including duplicates, in this ordered segment. */
  readonly size: number;
  /** One decoded definition for a leaf, or null for an empty/composite segment. */
  readonly definition: MarkdownReference | null;
  /** Shared nonempty segments in source order; empty for leaves. */
  readonly children: readonly ReferenceSummary[];
}

/** Exact summary comparison work, separate from parsing and definition reads. */
export interface ReferenceComparisonWork {
  /** Segment identity/size checks, including expansion before a shared segment is found. */
  summaryComparisons: number;
  /** Definitions skipped through exact immutable segment identity. */
  reusedDefinitions: number;
  /** Definition fields or label memberships compared individually. */
  definitionComparisons: number;
}

/** Independent ordered semantic and label-sequence equivalence results. */
export interface ReferenceEquivalence {
  /** All labels, destinations and titles match in their original order. */
  readonly entries: boolean;
  /** All normalized labels match in order; destinations may differ. */
  readonly labels: boolean;
}
