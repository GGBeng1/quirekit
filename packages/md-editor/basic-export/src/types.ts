import type { MdDocxDiagnostic } from '@quirekit/md-editor';

/** Options shared by the basic Word converter and PDF exporter. */
export interface MdBasicExportOptions {
  /** Maximum embedded images per document, passed to the underlying converter; default 50. */
  readonly maxImages?: number;
}

/** Fonts the basic PDF exporter embeds; the defaults come from `@quirekit/font-pack`. */
export interface MdBasicPdfFonts {
  /** Regular face covering CJK and Latin text, as a URL or font bytes. */ readonly regular: string | Uint8Array;
  /** Bold face covering CJK and Latin text, as a URL or font bytes. */ readonly bold: string | Uint8Array;
}

/** Options of the basic PDF exporter. */
export interface MdBasicPdfOptions extends MdBasicExportOptions {
  /** Fonts to embed; override when the application serves fonts itself. The first export on a page installs them. */
  readonly fonts?: MdBasicPdfFonts;
}

/** Markdown rewritten into syntax the open-source converters understand, plus every approximation made. */
export interface MdBasicPreparedSource {
  /** Converter-ready Markdown. */ readonly markdown: string;
  /** One entry per approximated or replaced construct, in source order. */ readonly diagnostics: readonly MdDocxDiagnostic[];
}

/** How a target renders named containers. */
export interface MdBasicPrepareOptions {
  /** Emit GitHub alert markers for note-like containers; the Word converter renders them as callouts. */
  readonly alerts: boolean;
  /** Whether the editor has containers installed; false keeps `:::` lines as text. */
  readonly containers: boolean;
}
