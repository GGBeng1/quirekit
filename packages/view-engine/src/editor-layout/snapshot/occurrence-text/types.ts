import type { Node as PMNode } from "@quirekit/pm";
import type { QuirePaginationOccurrenceFacts } from "@quirekit/layout/pagination";
import type { QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutDocument, QuirePaginationTextDiagnostic } from "../../../layout/engine/types";

export type { QuireSourceFlowPageBand as PaginationTextBand } from "@quirekit/layout/pagination";

/** Complete source and page facts for one section before window projection. */
export interface QuirePaginationTextSource {
  /** Physical sheet offset, accounting for sections sharing one sheet. */
  readonly physicalPageOffset?: number | undefined;
  /** Effective numbering owner, or null for unsectioned documents. */
  readonly section: QuirePageSection | null;
  /** One-based section order. */
  readonly sectionNumber: number;
  /** Full measured infinite-flow product. */
  readonly sourceDocument: QuireLayoutDocument;
  /** Complete physical pages with their source-flow bands. */
  readonly paginatedDocument: QuireLayoutDocument;
}

/** Physical facts used by the profile formatter; no document-specific field names. */
export interface QuirePaginationTextFacts extends QuirePaginationOccurrenceFacts {
  /** Canonical document for document-wide policy. */
  readonly documentNode?: PMNode | undefined;
}

/** Candidate text with observable preservation diagnostics. */
export interface QuirePaginationTextDerivation {
  /** Candidate strings keyed by logical source identity. */
  readonly values: ReadonlyMap<string, string>;
  /** Whether any displayed string differs from the measured source product. */
  readonly changed: boolean;
  /** Sources whose original result must be retained. */
  readonly diagnostics: readonly QuirePaginationTextDiagnostic[];
}
