import type { MdDocxReport, MdDocxRequest } from '../docx/types';

/** Browser and cancellation authority captured when one export starts. */
export interface MdExportContext {
  /** The editor host's browser document, used for font and image preparation. */ readonly ownerDocument: Document;
  /** Aborted on close, document replacement or template change. */ readonly signal: AbortSignal;
}

/** File produced by an installed exporter, with its conversion report. */
export interface MdExportResult extends MdDocxReport {
  /** Complete file bytes. */ readonly data: Uint8Array;
  /** Physical page count for paginated formats. */ readonly pageCount?: number;
}

/** One host-installed export format offered in the editor's file menu. */
export interface MdExporter {
  /** Stable identifier, conventionally the file extension. */ readonly id: string;
  /** Format name shown in menus and dialogs, such as `PDF`. */ readonly format: string;
  /** File extension without the dot. */ readonly extension: string;
  /** Media type of the produced file. */ readonly mimeType: string;
  /**
   * Converts one captured source snapshot; loaded only on explicit invocation.
   * @param markdown - Captured source snapshot.
   * @param request - Policy with the selected export template, installed features and lifetime.
   * @param context - Browser and cancellation capabilities.
   * @returns File bytes and reviewable conversion diagnostics.
   */
  readonly export: (markdown: string, request: MdDocxRequest, context: MdExportContext) => Promise<MdExportResult>;
  /**
   * Describes a format-specific diagnostic in the product language.
   * @param code - Diagnostic code reported by this exporter.
   * @param locale - Product control language.
   * @returns Readable text, or undefined to use the editor's generic description.
   */
  readonly describeDiagnostic?: (code: string, locale: 'zh-CN' | 'en') => string | undefined;
  /**
   * Optional provider notice shown in the file dialog, such as an evaluation notice.
   * @param locale - Product control language.
   * @returns Text to show, or null for none.
   */
  readonly notice?: (locale: 'zh-CN' | 'en') => Promise<string | null>;
}
