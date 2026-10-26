/** Controlled inputs for the shared Classic confirmation dialog. */
export interface ClassicEditorConfirmDialogProps {
  /** Whether the dialog is visible. */
  readonly show: boolean;
  /** Mounted Classic root that owns theme and document scope. */
  readonly themeRoot: HTMLElement;
  /** Dialog heading. */
  readonly title: string;
  /** Confirmation question or consequence summary. */
  readonly message: string;
  /** Label for the non-destructive dismissal action. */
  readonly cancelLabel: string;
  /** Label for the confirming action. */
  readonly confirmLabel: string;
  /** Whether an in-flight action temporarily disables dismissal and confirmation. */
  readonly busy?: boolean | undefined;
  /** Whether the confirming action is destructive. */
  readonly destructive?: boolean | undefined;
  /** Overlay family used for per-editor exclusivity diagnostics. */
  readonly overlayFamily?: string | undefined;
}
