import type { EditorState } from "@quirekit/cm-state";
import type { SourceAnchor } from "@quirekit/msfe-core";
import type { ExportTemplateProvider, ExportTemplateReference } from '@quirekit/export-template';

/** Explicit file action; Markdown export needs no draft dialog. */
export type MdFileMode = "markdownImport" | "wordImport" | "wordExport" | "formatExport";

/** Import always targets the whole document or its end, independently of selection. */
export type MdImportAction = "append" | "replace";

/** File operation ownership captured before asynchronous reading or conversion. */
export interface MdFileIntent {
  /** Installed format exporter captured at the export action rather than reread during conversion. */ readonly exporter?: import('../../export/types').MdExporter;
  /** Exact style reference captured with the source; changed only by explicit picker use. */ readonly templateReference?: ExportTemplateReference;
  /** Provider captured for this file operation. */ readonly templateProvider?: ExportTemplateProvider;
  /** Import draft or export snapshot. */ readonly mode: MdFileMode;
  /** Whole-source guard; invalidated by source changes or document replacement. */ readonly anchor: SourceAnchor | null;
  /** Source copied once at the explicit export action. */ readonly markdown: string;
  /** Immutable export snapshot, so export-time link rewriting reads the same source. */ readonly state?: EditorState;
}
