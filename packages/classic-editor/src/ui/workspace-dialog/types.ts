/** Supported semantic widths for one Classic workspace dialog. */
export type ClassicEditorWorkspaceDialogSize = "medium" | "wide";

/** Public inputs for the shared Classic workspace-dialog recipe. */
export interface ClassicEditorWorkspaceDialogProps {
  /** Whether the controlled workspace is visible. */
  readonly show: boolean;
  /** Product-visible workspace title. */
  readonly title: string;
  /** Optional Classic root that owns the teleport document and focus scope. */
  readonly themeRoot?: HTMLElement | undefined;
  /** Optional explicit theme variables retained for standalone consumers. */
  readonly themeVariables?: Readonly<Record<string, string>> | undefined;
  /** Semantic workspace width intent. */
  readonly size?: ClassicEditorWorkspaceDialogSize;
  /** Whether an in-flight workspace task prevents dismissal. */
  readonly busy?: boolean;
  /** Whether clicking the modal mask may request dismissal. */
  readonly maskClosable?: boolean;
  /** Whether Escape may request dismissal. */
  readonly closeOnEsc?: boolean;
  /** Whether to focus the first control; false focuses the modal surface without editing a field. */
  readonly autoFocus?: boolean;
  /** Overlay ownership attributes applied to the visible semantic surface. */
  readonly ownerAttributes?: Readonly<Record<string, string>>;
  /** Optional product class applied to the visible semantic surface. */
  readonly surfaceClass?: string;
  /** Optional feature class applied to the workspace-owned body region. */
  readonly bodyClass?: string;
}

/** Public slots rendered by the shared Classic workspace-dialog recipe. */
export interface ClassicEditorWorkspaceDialogSlots {
  /** Feature-owned navigation, visual stage, results, and actions. */
  readonly default: () => unknown;
}
