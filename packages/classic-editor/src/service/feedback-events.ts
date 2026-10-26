/** Browser event carrying product-wide operation feedback to the Classic shell. */
export const classicEditorOperationFeedbackEvent =
  "quirekit:operation-feedback";

/** Visual importance of one product operation outcome. */
export type ClassicEditorOperationFeedbackTone =
  | "progress"
  | "success"
  | "info"
  | "warning"
  | "error";

/** One structured detail row rendered by the shared operation feedback surface. */
export interface ClassicEditorOperationFeedbackItem {
  /** Stable machine-readable detail identity. */
  readonly code: string;
  /** Human-readable detail. */
  readonly message: string;
  /** Optional structural or resource location. */
  readonly path?: string | undefined;
}

/** Product-wide operation feedback emitted from the Classic Editor root. */
export interface ClassicEditorOperationFeedbackDetail {
  /** Visual importance used by accessible shell styling. */
  readonly tone: ClassicEditorOperationFeedbackTone;
  /** Localized operation status or outcome. */
  readonly title: string;
  /** Optional concise supporting detail. */
  readonly summary?: string | undefined;
  /** Optional structured diagnostics. */
  readonly items?: readonly ClassicEditorOperationFeedbackItem[] | undefined;
  /** Optional positive delay before the shell dismisses this feedback. */
  readonly autoDismissMs?: number | undefined;
}

/**
 * Publishes one operation outcome through the shared Classic shell surface.
 *
 * @param root - Product root that owns the feedback surface.
 * @param detail - Localized operation state and optional diagnostics.
 */
export function emitClassicEditorOperationFeedback(
  root: HTMLElement,
  detail: ClassicEditorOperationFeedbackDetail
): void {
  root.dispatchEvent(new CustomEvent<ClassicEditorOperationFeedbackDetail>(
    classicEditorOperationFeedbackEvent,
    { detail }
  ));
}
