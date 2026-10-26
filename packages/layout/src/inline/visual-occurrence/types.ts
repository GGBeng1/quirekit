/** Explicit visual occurrence represented by one renderer-neutral layout anchor. */
export type QuireInlineSourceVisualOccurrence =
  | {
      /** A single source-flow occurrence has no repeated visual identity. */
      readonly kind: "single";
    }
  | {
      /** A page occurrence is derived by pagination from one logical source anchor. */
      readonly kind: "page";
      /** Zero-based page index that owns this occurrence. */
      readonly pageIndex: number;
      /** Snapshot-local visual identity shared with the exact retained owner region. */
      readonly visualInstanceId: string;
    };

/** Machine-readable failure produced while compiling inline source occurrences. */
export interface QuireInlineSourceVisualOccurrenceGap {
  /** Stable failure classification. */
  readonly code:
    | "invalid-owner-identity"
    | "missing-page-occurrence"
    | "non-logical-source-anchor"
    | "visual-instance-collision";
  /** Logical source anchor that failed occurrence compilation. */
  readonly sourceAnchorId: string;
  /** Page involved in the failure, when one was known. */
  readonly pageIndex?: number | undefined;
  /** Human-readable diagnostic that does not invent fallback identity. */
  readonly message: string;
}
