import type { QuireDocumentRange } from "@quirekit/renderer";
/** Physical occurrence relation supplied to a document-owned text formatter. */
export interface QuirePaginationReferenceFacts {
  /** Whether source and target occupy the same physical sheet, independent of display numbering. */
  readonly samePage: boolean;
  /** Absolute source position in the canonical document. */
  readonly sourcePosition: number;
  /** Absolute referenced position in the canonical document. */
  readonly targetPosition: number;
}

/** Complete physical pagination facts for one text occurrence, independent of document semantics. */
export interface QuirePaginationOccurrenceFacts {
  /** Canonical body ranges on this physical sheet, excluding auxiliary stories. */
  readonly bodyRanges?: readonly QuireDocumentRange[];
  /** Source/target physical relation for referenced occurrences. */
  readonly reference?: QuirePaginationReferenceFacts | undefined;
  /** Zero-based local page inside the owning section. */
  readonly pageIndex: number;
  /** Distinct physical sheets in the complete document. */
  readonly pageCount: number;
  /** One-based section order. */
  readonly sectionNumber: number;
  /** Physical sheets occupied by the section, including shared continuous-section pages. */
  readonly sectionPageCount: number;
}
