import type { Ref } from "vue";

/** Visual importance of one document-service feedback panel. */
export type ClassicEditorDocumentServiceFeedbackTone =
  | "progress"
  | "success"
  | "info"
  | "warning"
  | "error";

/** Diagnostic copy mode exposed by the compatibility feedback surface. */
export type ClassicEditorDiagnosticCopyMode = "all" | "deduplicated";

/** Transient outcome shown by one diagnostic copy action. */
export interface ClassicEditorDiagnosticCopyResult {
  /** Requested compatibility copy projection. */
  readonly mode: ClassicEditorDiagnosticCopyMode;
  /** Browser clipboard outcome. */
  readonly status: "copied" | "failed";
}

/** One actionable detail row rendered in document-service feedback. */
export interface ClassicEditorDocumentServiceFeedbackItem {
  /** Stable warning, diagnostic, or error identity. */
  readonly code: string;
  /** Human-readable detail. */
  readonly message: string;
  /** Optional structural or package location. */
  readonly path?: string | undefined;
  /** Optional diagnostic importance retained for copied reports. */
  readonly severity?: "info" | "warning" | "error" | undefined;
  /** Optional preservation outcome retained for copied reports. */
  readonly disposition?: "preserved" | "approximated" | "rejected" | undefined;
  /** Optional editor position the row can jump to. */
  readonly position?: number | undefined;
}

/** Current product-visible document-service feedback. */
export interface ClassicEditorDocumentServiceFeedback {
  /** Document-service operation associated with this feedback. */
  readonly operation?: "import" | "export" | undefined;
  /** Registered document-service identity associated with this feedback. */
  readonly serviceId?: string | undefined;
  /** Visual importance used by accessible styling. */
  readonly tone: ClassicEditorDocumentServiceFeedbackTone;
  /** Localized operation outcome. */
  readonly title: string;
  /** Optional file name or concise supporting detail. */
  readonly summary?: string | undefined;
  /** Structured diagnostics retained until dismissal. */
  readonly items: readonly ClassicEditorDocumentServiceFeedbackItem[];
}

/** Controller returned to the document-service feedback surface. */
export interface ClassicEditorDocumentServiceFeedbackController {
  /** Current feedback, or null when the surface is hidden. */
  readonly feedback: Readonly<Ref<ClassicEditorDocumentServiceFeedback | null>>;
  /** Dismisses the current feedback. */
  dismiss(): void;
  /** Stops automatic dismissal while the user reads or copies report details. */
  keepVisible(): void;
}
