import type { MdDocxDiagnostic } from '@quirekit/md-editor';

/** One pdfmake content node; the library accepts plain objects, strings and arrays. */
export type PdfContent = string | readonly PdfContent[] | { readonly [key: string]: unknown };

/** State shared while one Markdown tree is mapped to a pdfmake document. */
export interface PdfMappingContext {
  /** Report receiving one entry per approximation. */ readonly diagnostics: MdDocxDiagnostic[];
  /** Raster data URIs of every image source, resolved before mapping; null when unavailable. */ readonly images: ReadonlyMap<string, string | null>;
  /** Link reference definitions keyed by normalized label. */ readonly definitions: ReadonlyMap<string, string>;
  /** Footnote numbers in order of first reference. */ readonly footnotes: Map<string, number>;
  /** Font family registered for this document. */ readonly font: string;
}
