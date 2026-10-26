import type {
  ClassicEditorDocumentServiceDiagnostic,
  ClassicEditorDocumentServiceErrorDetail,
  ClassicEditorDocumentServiceReportDetail
} from "@classic/service";
import type {
  BuiltinClassicEditorMessageKey,
  BuiltinClassicEditorMessageParameters
} from "@classic/localization";
import type {
  ClassicEditorDocumentServiceFeedback,
  ClassicEditorDocumentServiceFeedbackTone
} from "./types";

/** Product localization resolver used by feedback model builders. */
export type ClassicEditorFeedbackMessageResolver = (
  key: BuiltinClassicEditorMessageKey,
  parameters?: BuiltinClassicEditorMessageParameters
) => string;

const localizedDiagnosticMessageKeys: Readonly<
  Partial<Record<string, BuiltinClassicEditorMessageKey>>
> = Object.freeze({
  "last-rendered-page-break-preserved":
    "documentDiagnosticLastRenderedPageBreakPreserved",
  "word-inline-content-control-preserved":
    "documentDiagnosticInlineContentControlPreserved",
  "codec-failed": "documentDiagnosticCodecFailed",
  "export-node-text-fallback": "documentDiagnosticExportTextFallback",
  "export-node-dropped": "documentDiagnosticExportDropped",
  "schema-invalid-block": "documentDiagnosticSchemaInvalidBlock",
  "contribution-skipped": "documentDiagnosticContributionSkipped",
  "table-revision-store-fallback": "documentDiagnosticTableRevisionFallback",
  "picture-dropped": "documentDiagnosticPictureDropped",
  "section-missing-defaulted": "documentDiagnosticSectionMissingDefaulted",
  "section-trailing-content-adopted": "documentDiagnosticSectionTrailingContentAdopted"
});

/**
 * Keeps informational conversion details under an ordinary success outcome.
 *
 * @param detail - Generic codec report.
 * @param message - Product localization resolver.
 * @returns Severity-based feedback with all diagnostic rows retained.
 */
export function createDocumentServiceReportFeedback(
  detail: ClassicEditorDocumentServiceReportDetail,
  message: ClassicEditorFeedbackMessageResolver
): ClassicEditorDocumentServiceFeedback {
  const issueCount = detail.warnings.length + detail.diagnostics.filter(
    (diagnostic) => diagnostic.severity !== "info"
  ).length;
  const lossCount = detail.diagnostics.filter(isContentLoss).length;
  const count = lossCount > 0 ? lossCount : issueCount;
  const title = message(
    lossCount > 0
      ? `document${detail.operation === "export" ? "Export" : "Import"}ContentLoss`
      : resolveReportTitleKey(detail, issueCount),
    { count }
  );
  return {
    operation: detail.operation,
    serviceId: detail.serviceId,
    tone: resolveReportTone(detail.diagnostics, detail.warnings.length),
    title,
    summary: detail.fileName,
    items: [
      ...detail.warnings.map((warning) => ({
        code: warning.code,
        message: warning.message,
        ...(warning.path === undefined ? {} : { path: warning.path })
      })),
      ...detail.diagnostics.map((diagnostic) => ({
        code: diagnostic.code,
        message: resolveDiagnosticMessage(diagnostic, message),
        ...(diagnostic.path === undefined ? {} : { path: diagnostic.path }),
        ...(diagnostic.severity === undefined
          ? {}
          : { severity: diagnostic.severity }),
        ...(diagnostic.disposition === undefined
          ? {}
          : { disposition: diagnostic.disposition }),
        ...(diagnostic.position === undefined
          ? {}
          : { position: diagnostic.position })
      }))
    ]
  };
}

/**
 * Reads whether a diagnostic means content was not kept as authored.
 *
 * @param diagnostic - Structured codec diagnostic.
 * @returns Whether it is an error-severity approximation or rejection.
 */
function isContentLoss(diagnostic: ClassicEditorDocumentServiceDiagnostic): boolean {
  return diagnostic.severity === "error"
    && (diagnostic.disposition === "approximated"
      || diagnostic.disposition === "rejected");
}

/**
 * Names actual issues; routine informational records use the success title.
 *
 * @param detail - Generic codec report.
 * @param issueCount - Count of parser warnings and non-informational diagnostics.
 * @returns Built-in message key for the operation outcome.
 */
function resolveReportTitleKey(
  detail: ClassicEditorDocumentServiceReportDetail,
  issueCount: number
): BuiltinClassicEditorMessageKey {
  const operation = detail.operation === "export" ? "Export" : "Import";
  if (issueCount > 0) {
    return `document${operation}CompatibilityIssues`;
  }
  return `document${operation}Completed`;
}

/**
 * Resolves product-owned copy for known diagnostics and preserves unknown fallbacks.
 *
 * Stable diagnostic codes remain visible and copyable, while the active product
 * locale owns the human-readable explanation for diagnostics it understands.
 *
 * @param diagnostic - Structured codec diagnostic.
 * @param message - Product localization resolver.
 * @returns Localized explanation or the source diagnostic fallback.
 */
function resolveDiagnosticMessage(
  diagnostic: ClassicEditorDocumentServiceDiagnostic,
  message: ClassicEditorFeedbackMessageResolver
): string {
  const key = localizedDiagnosticMessageKeys[diagnostic.code];
  return key === undefined ? diagnostic.message : message(key);
}

/**
 * Builds one persistent failure state without hiding an import's file identity.
 *
 * @param detail - Generic document-service failure detail.
 * @param message - Product localization resolver.
 * @param fallbackSummary - Localized format label used before file selection.
 * @returns Structured shell feedback for the failed operation.
 */
export function createDocumentServiceErrorFeedback(
  detail: ClassicEditorDocumentServiceErrorDetail,
  message: ClassicEditorFeedbackMessageResolver,
  fallbackSummary: string
): ClassicEditorDocumentServiceFeedback {
  return {
    operation: detail.contribution.operation,
    serviceId: detail.contribution.service,
    tone: "error",
    title: message(
      detail.contribution.operation === "export"
        ? "documentExportFailed"
        : "documentImportFailed"
    ),
    summary: detail.fileName ?? fallbackSummary,
    items: [{
      code: resolveDocumentServiceErrorCode(detail.error),
      message: detail.error.message || String(detail.error)
    }]
  };
}

/**
 * Resolves report tone from authoritative warning and diagnostic severity.
 *
 * @param diagnostics - Structural conversion diagnostics.
 * @param warningCount - Parser warning count.
 * @returns Highest product-visible importance.
 */
function resolveReportTone(
  diagnostics: readonly ClassicEditorDocumentServiceDiagnostic[],
  warningCount: number
): ClassicEditorDocumentServiceFeedbackTone {
  if (diagnostics.some((diagnostic) => diagnostic.severity === "error")) {
    return "error";
  }
  if (
    warningCount > 0
    || diagnostics.some((diagnostic) => diagnostic.severity !== "info")
  ) {
    return "warning";
  }
  return "success";
}

/**
 * Preserves a typed service error code before falling back to the JS class name.
 *
 * @param error - Normalized operation error supplied by the service boundary.
 * @returns Stable machine-readable code for visible and copied diagnostics.
 */
function resolveDocumentServiceErrorCode(error: Error): string {
  const code = (error as Error & { readonly code?: unknown }).code;
  return typeof code === "string" && code.trim() !== ""
    ? code
    : error.name || "Error";
}
