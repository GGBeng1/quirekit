import type { ClassicEditorDocumentServiceMenuContribution } from "../types";

/** Browser event emitted when a document service operation starts. */
export const classicEditorDocumentServiceStartEvent =
  "quirekit:document-service-start";

/** Browser event emitted when a document service publishes conversion details. */
export const classicEditorDocumentServiceReportEvent =
  "quirekit:document-service-report";

/** Browser event emitted after an import completes or a download is dispatched. */
export const classicEditorDocumentServiceSuccessEvent =
  "quirekit:document-service-success";

/** Browser event emitted when a document service operation fails. */
export const classicEditorDocumentServiceErrorEvent =
  "quirekit:document-service-error";

/** One normalized non-fatal parser or package warning. */
export interface ClassicEditorDocumentServiceWarning {
  /** Stable machine-readable warning code. */
  readonly code: string;
  /** Human-readable warning detail. */
  readonly message: string;
  /** Optional package, XML, or structural location. */
  readonly path?: string | undefined;
}

/** One normalized structural conversion diagnostic. */
export interface ClassicEditorDocumentServiceDiagnostic {
  /** Stable machine-readable diagnostic code. */
  readonly code: string;
  /** Human-readable conversion detail. */
  readonly message: string;
  /** Optional structural document path. */
  readonly path?: string | undefined;
  /** User-facing importance of the outcome. */
  readonly severity?: "info" | "warning" | "error" | undefined;
  /** Preservation or loss outcome when supplied by the codec. */
  readonly disposition?: "preserved" | "approximated" | "rejected" | undefined;
  /** Editor position of the affected content when the service resolved one. */
  readonly position?: number | undefined;
}

/** Observable start detail emitted from the Classic Editor product root. */
export interface ClassicEditorDocumentServiceStartDetail {
  /** Contribution that initiated the operation. */
  readonly contribution: ClassicEditorDocumentServiceMenuContribution;
}

/** Generic conversion report emitted by an installed document codec. */
export interface ClassicEditorDocumentServiceReportDetail {
  /** Completed document operation. */
  readonly operation: "import" | "export";
  /** Registered document-service id. */
  readonly serviceId: string;
  /** Imported source or exported target file name. */
  readonly fileName: string;
  /** Non-fatal parser or package warnings. */
  readonly warnings: readonly ClassicEditorDocumentServiceWarning[];
  /** Structural conversion compatibility diagnostics. */
  readonly diagnostics: readonly ClassicEditorDocumentServiceDiagnostic[];
}

/** Observable success detail emitted from the Classic Editor product root. */
export interface ClassicEditorDocumentServiceSuccessDetail {
  /** Contribution that initiated the completed operation. */
  readonly contribution: ClassicEditorDocumentServiceMenuContribution;
  /** Imported source or exported target file name. */
  readonly fileName: string;
}

/** Observable failure detail emitted from the Classic Editor product root. */
export interface ClassicEditorDocumentServiceErrorDetail {
  /** Contribution that initiated the failed operation. */
  readonly contribution: ClassicEditorDocumentServiceMenuContribution;
  /** Selected import file name when an artifact had already been chosen. */
  readonly fileName?: string | undefined;
  /** Normalized operation error. */
  readonly error: Error;
}
