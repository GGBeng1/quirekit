import {
  onBeforeUnmount,
  ref,
  watch,
  type Ref
} from "vue";
import {
  classicEditorOperationFeedbackEvent,
  classicEditorDocumentServiceErrorEvent,
  classicEditorDocumentServiceReportEvent,
  classicEditorDocumentServiceStartEvent,
  classicEditorDocumentServiceSuccessEvent,
  type ClassicEditorDocumentServiceErrorDetail,
  type ClassicEditorDocumentServiceReportDetail,
  type ClassicEditorDocumentServiceStartDetail,
  type ClassicEditorDocumentServiceSuccessDetail,
  type ClassicEditorOperationFeedbackDetail
} from "@classic/service";
import { useClassicEditorShellContributions } from "../composables/use/shell-contributions";
import type { ClassicEditorShellModel } from "../types";
import {
  createDocumentServiceErrorFeedback,
  createDocumentServiceReportFeedback
} from "./model";
import type {
  ClassicEditorDocumentServiceFeedback,
  ClassicEditorDocumentServiceFeedbackController
} from "./types";

/**
 * Consumes product-root document-service events into accessible shell feedback.
 *
 * @param model - Reactive private shell model.
 * @param root - Current product root that owns document-service events.
 * @returns Reactive feedback and dismissal action.
 */
export function useClassicEditorDocumentServiceFeedback(
  model: Readonly<Ref<ClassicEditorShellModel>>,
  root: Readonly<Ref<HTMLElement | undefined>>
): ClassicEditorDocumentServiceFeedbackController {
  const { message, text } = useClassicEditorShellContributions(model);
  const feedback = ref<ClassicEditorDocumentServiceFeedback | null>(null);
  let latestReport: ClassicEditorDocumentServiceReportDetail | null = null;
  let successTimer: ReturnType<typeof setTimeout> | undefined;

  const onStart = (event: Event): void => {
    const detail = readDetail<ClassicEditorDocumentServiceStartDetail>(event);
    if (detail === undefined) return;
    clearSuccessTimer();
    latestReport = null;
    feedback.value = {
      tone: "progress",
      title: message(
        detail.contribution.operation === "export"
          ? "exportingDocumentFormat"
          : "importingDocumentFormat",
        { format: text(detail.contribution.label) }
      ),
      items: []
    };
  };
  const onReport = (event: Event): void => {
    const detail = readDetail<ClassicEditorDocumentServiceReportDetail>(event);
    if (detail === undefined) return;
    latestReport = detail;
    if (detail.warnings.length === 0 && detail.diagnostics.length === 0) return;
    clearSuccessTimer();
    feedback.value = createDocumentServiceReportFeedback(detail, message);
    if (feedback.value.tone === "success") startSuccessTimer();
  };
  const onSuccess = (event: Event): void => {
    const detail = readDetail<ClassicEditorDocumentServiceSuccessDetail>(event);
    if (detail === undefined) return;
    if (
      latestReport !== null
      && latestReport.operation === detail.contribution.operation
      && latestReport.serviceId === detail.contribution.service
      && (
        latestReport.warnings.length > 0
        || latestReport.diagnostics.length > 0
      )
    ) {
      feedback.value = createDocumentServiceReportFeedback(latestReport, message);
      return;
    }
    feedback.value = {
      tone: "success",
      title: message(
        detail.contribution.operation === "export"
          ? "documentDownloadStarted"
          : "documentImported",
        { fileName: detail.fileName }
      ),
      items: []
    };
    startSuccessTimer();
  };
  const onError = (event: Event): void => {
    const detail = readDetail<ClassicEditorDocumentServiceErrorDetail>(event);
    if (detail === undefined) return;
    clearSuccessTimer();
    latestReport = null;
    feedback.value = createDocumentServiceErrorFeedback(
      detail,
      message,
      text(detail.contribution.label)
    );
  };
  const onOperationFeedback = (event: Event): void => {
    const detail = readDetail<ClassicEditorOperationFeedbackDetail>(event);
    if (detail === undefined) return;
    clearSuccessTimer();
    feedback.value = {
      tone: detail.tone,
      title: detail.title,
      ...(detail.summary === undefined ? {} : { summary: detail.summary }),
      items: detail.items ?? []
    };
    if (
      detail.autoDismissMs !== undefined
      && Number.isFinite(detail.autoDismissMs)
      && detail.autoDismissMs > 0
    ) {
      successTimer = setTimeout(() => {
        feedback.value = null;
        successTimer = undefined;
      }, detail.autoDismissMs);
    }
  };

  watch(root, (current, previous) => {
    updateRootListeners(previous, "removeEventListener");
    updateRootListeners(current, "addEventListener");
  }, { immediate: true });

  onBeforeUnmount(() => {
    updateRootListeners(root.value, "removeEventListener");
    clearSuccessTimer();
  });

  /** Dismisses persistent or transient document-service feedback. */
  function dismiss(): void {
    clearSuccessTimer();
    feedback.value = null;
  }

  /**
   * Adds or removes every document-service listener on one product root.
   *
   * @param element - Product root to update.
   * @param method - DOM listener mutation method.
   */
  function updateRootListeners(
    element: HTMLElement | undefined,
    method: "addEventListener" | "removeEventListener"
  ): void {
    element?.[method](classicEditorDocumentServiceStartEvent, onStart);
    element?.[method](classicEditorDocumentServiceReportEvent, onReport);
    element?.[method](classicEditorDocumentServiceSuccessEvent, onSuccess);
    element?.[method](classicEditorDocumentServiceErrorEvent, onError);
    element?.[method](classicEditorOperationFeedbackEvent, onOperationFeedback);
  }

  /** Clears the auto-dismiss timer without changing current feedback. */
  function clearSuccessTimer(): void {
    if (successTimer === undefined) return;
    clearTimeout(successTimer);
    successTimer = undefined;
  }

  /** Auto-dismisses routine success; warnings and errors never enter this path. */
  function startSuccessTimer(): void {
    clearSuccessTimer();
    successTimer = setTimeout(() => {
      feedback.value = null;
      successTimer = undefined;
    }, 3_200);
  }

  return { feedback, dismiss, keepVisible: clearSuccessTimer };
}

/**
 * Reads one typed CustomEvent detail without trusting unrelated DOM events.
 *
 * @param event - Candidate product-root event.
 * @returns Typed detail, or undefined for a plain event.
 */
function readDetail<T>(event: Event): T | undefined {
  return event instanceof CustomEvent ? event.detail as T : undefined;
}
