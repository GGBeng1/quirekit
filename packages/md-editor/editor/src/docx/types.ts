import type { ExportTemplateInput } from '@quirekit/export-template';
import type { MdEditorExtensionOptions } from '../types';

/** One explicit conversion decision, suitable for UI or machine inspection. */
export interface MdDocxDiagnostic {
  /** Direction relative to the Word file. */ readonly direction: 'import' | 'export';
  /** Stable classification, independent of localized UI. */ readonly code: string;
  /** AST path or codec source location. */ readonly path: string;
  /** Whether this decision loses source semantics. */ readonly severity: 'info' | 'warning';
  /** Result of the projection. */ readonly disposition: 'projected' | 'approximated' | 'unsupported';
  /** Human-readable explanation. */ readonly message: string;
}

/** An embedded image offered to explicit host storage. */
export interface MdDocxImage {
  /** Validated PNG/JPEG data URI; never a temporary object URL. */ readonly dataUrl: string;
  /** Accessible alternative text. */ readonly alt: string;
}

/** Host conversion policy shared by Word files and installed format exporters. */
export interface MdDocxPolicy {
  /** Export-only appearance; omitted fields use the validated default. */ readonly template?: ExportTemplateInput;
  /** Export-only frozen document title for header/footer variables; otherwise the first H1 is used. */ readonly documentTitle?: string;
  /** Best effort returns losses; strict rejects any warning. */ readonly lossPolicy?: 'best-effort' | 'strict';
  /** Resolve a Markdown image source to a PNG/JPEG data URI. No implicit network access. */
  readonly resolveImage?: (source: string) => Promise<string | null>;
  /** Persist an imported image and return a stable safe URL; omission retains the data URI. */
  readonly storeImage?: (image: MdDocxImage) => Promise<string | null>;
  /** Disable source metadata to export only native Word content and images; default true. */ readonly preserveMetadata?: boolean;
  /** Disable default container, diagram and whiteboard conversions; host extensions still run. */ readonly builtins?: false;
}

/** One explicit file operation handed to a converter or exporter. */
export interface MdDocxRequest {
  /** Policy with the selected export template already resolved. */ readonly policy: MdDocxPolicy;
  /** Installed product syntax used to select default codecs. */ readonly features: MdEditorExtensionOptions;
  /** Aborted on close, document replacement or template change. */ readonly signal: AbortSignal;
}

/** Shared result surface of every conversion. */
export interface MdDocxReport {
  /** All approximations, omissions and codec warnings in traversal order. */ readonly diagnostics: readonly MdDocxDiagnostic[];
}

/** Imported canonical source ready for explicit insertion. */
export interface MdDocxImportResult extends MdDocxReport {
  /** CommonMark/GFM source with normalized syntax. */ readonly markdown: string;
}

/** Downloadable DOCX bytes. */
export interface MdDocxExportResult extends MdDocxReport {
  /** Complete OOXML ZIP package. */ readonly data: Uint8Array;
}

/** Host-installed Word conversion; loaded only on explicit file actions. */
export interface MdDocxConverter {
  /**
   * Converts one Word file into Markdown source.
   * @param data - Complete DOCX bytes.
   * @param request - Policy, installed features and lifetime of this import.
   * @returns Markdown and reviewable diagnostics.
   */
  readonly importDocx: (data: Uint8Array, request: MdDocxRequest) => Promise<MdDocxImportResult>;
  /**
   * Converts one captured Markdown snapshot into a Word file.
   * @param markdown - Captured source snapshot.
   * @param request - Policy, installed features and lifetime of this export.
   * @returns DOCX bytes and reviewable diagnostics.
   */
  readonly exportDocx: (markdown: string, request: MdDocxRequest) => Promise<MdDocxExportResult>;
  /**
   * Optional provider notice shown in the file dialog, such as an evaluation notice.
   * @param locale - Product control language.
   * @returns Text to show, or null for none.
   */
  readonly notice?: (locale: 'zh-CN' | 'en') => Promise<string | null>;
}

/** Word file actions: a host-installed converter plus its conversion policy. */
export interface MdDocxOptions extends MdDocxPolicy {
  /** Converter performing import and export. */ readonly converter: MdDocxConverter;
}

/** Source fields a host can map to a container appearance in Word. */
export interface MdDocxContainerHeader {
  /** Registered role. */ readonly name: string;
  /** Literal heading after the role. */ readonly title: string;
}

/** Word presentation for one container; omitted fields keep the export template's role style. */
export interface MdDocxContainerAppearance {
  /** Visible heading; an empty string omits it. Defaults to the source title. */ readonly title?: string;
  /** Whether the heading is bold; default true. */ readonly bold?: boolean;
  /** Icon shown in a narrow column beside the body, such as a highlight emoji. */ readonly lead?: string;
  /** Background RGB without `#`, or null for none. */ readonly fill?: string | null;
  /** Border RGB without `#`, or null for none. */ readonly border?: string | null;
  /** Body text RGB applied to runs that have no color of their own. */ readonly color?: string;
}
