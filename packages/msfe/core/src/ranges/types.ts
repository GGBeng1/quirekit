import type { MsfeSourceRange } from "../views/types";
import type { MsfeTarget } from "../editor/types";
import type { Text } from "@quirekit/cm-state";

/** Captured source identity; the document reference disambiguates view-mount and transaction phases. */
export interface AnchorContent {
  /** Exact captured text, validated before applying the intent. */
  readonly text: string;
  /** Immutable source version to which the current coordinates belong. */
  readonly document: Text;
}

/** Explicit boundary affinity and deletion policy, independent of how a range is painted. */
export interface RangePolicy {
  /** Include text inserted exactly at the start; default false. */
  readonly inclusiveStart?: boolean;
  /** Include text inserted exactly at the end; default false. */
  readonly inclusiveEnd?: boolean;
  /** Fully deleted/replaced ranges disappear by default; keep collapses to a point if needed. */
  readonly onDelete?: "drop" | "keep";
}

/** Source-coordinate metadata; callers own identity and persistence. */
export interface SourceRange<T> extends MsfeSourceRange, RangePolicy {
  /** Unique within this range collection, not a serialized document identity. */
  readonly id: string;
  /** Immutable feature-owned payload. */
  readonly value: T;
}

/** Document-generation-scoped intent with explicit position remapping. */
export interface SourceAnchor {
  /** @returns Current mapped interval, or null after removal, release or document replacement. */
  getRange(): MsfeSourceRange | null;
  /** @returns Fresh target only while captured text remains unchanged; never silently retargets modified content. */
  target(): MsfeTarget | null;
  /** Ends ownership without changing text or history. */
  release(): void;
}
