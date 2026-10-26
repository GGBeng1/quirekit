import type { QuireDocumentRange } from "@quirekit/renderer";
import type { QuirePageSection } from "../../../document-profile/types";
import type { QuireLayoutSnapshotOptions } from "../../types";
import type { QuireLayoutProduct } from "../reuse/types";
import type { QuirePaginationTextSource } from "../occurrence-text/types";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type { QuireLayoutDocument } from "../../../layout/engine/types";
import type { QuireInfiniteLayoutCompilation } from "../document";

/** Full source layout plus a window projector, before selection adaptation. */
export type SectionLayoutProduct = Omit<QuireLayoutProduct, "selectionStructureIndex"> & {
  /** Complete section-local page facts before any viewport projection. */
  readonly paginationTextSources?: readonly QuirePaginationTextSource[];
};

/** Section layout compiled from source, before a page context binds its window projection. */
export interface SectionLayoutSource {
  /** Compile inputs with the section page geometry resolved. */
  readonly options: QuireLayoutSnapshotOptions;
  /** Leading section of a single-flow document, used when no section context is bound. */
  readonly leadingSection: QuirePageSection | null;
  /** Measured body flow and auxiliary story sources. */
  readonly compilation: QuireInfiniteLayoutCompilation;
  /** Geometry pagination used, absent for an unpaginated flow. */
  readonly paginationPageGeometry: QuirePageGeometry | undefined;
  /** Complete pages with physical page indices, before window projection. */
  readonly paginatedDocument: QuireLayoutDocument;
}

/** Section-local semantics paired with document-global page identities. */
export interface SectionLayoutContext {
  /** Page-band content suppressed by an accepted terminal-placement policy. */
  readonly omittedBandRanges?: readonly QuireDocumentRange[] | undefined;
  /** Section with effective inherited semantics and numbering start. */
  readonly section: QuirePageSection;
  /** One-based semantic section order, independent of top-level node indices. */
  readonly sectionNumber?: number;
  /** Returns the section's accepted physical page count after compilation. */
  readonly sectionPageCount?: () => number;
  /** Physical page index of this section's first page. */
  readonly pageIndexOffset: number;
  /** Whether the first page is shared with the previous section, which owns its page bands. */
  readonly sharesFirstPage: boolean;
  /** Whether this is the document's last section, whose flow carries the end notes. */
  readonly endsDocument: boolean;
  /** @param pageIndex - Physical sheet identity. @returns Body ranges from all sections occupying that sheet. */
  readonly pageBodyRanges?: (pageIndex: number) => readonly QuireDocumentRange[];
  /** Returns the final whole-document total after every section has paginated. */
  readonly pageCount: () => number;
}

/** Compiles one section without rebasing canonical PM positions. */
export type CompileSectionLayout = (
  /** Section geometry and unchanged editor state. */
  options: QuireLayoutSnapshotOptions,
  /** Page identity and semantic owner. */
  context: SectionLayoutContext
) => SectionLayoutProduct;
