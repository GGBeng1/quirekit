/** Supported semantic widths for one Classic task dialog. */
export type ClassicEditorTaskDialogSize = "small" | "medium" | "large";

/** Supported semantic tones for one Classic task dialog. */
export type ClassicEditorTaskDialogTone = "default" | "danger";

/** Public inputs for the shared Classic task-dialog recipe. */
export interface ClassicEditorTaskDialogProps {
  /** Whether the controlled dialog is visible. */
  readonly show: boolean;
  /** Product-visible dialog title. */
  readonly title: string;
  /** Classic root that owns the teleport document and focus scope. */
  readonly themeRoot: HTMLElement;
  /** Semantic dialog width intent. */
  readonly size?: ClassicEditorTaskDialogSize;
  /** Semantic dialog tone. */
  readonly tone?: ClassicEditorTaskDialogTone;
  /** Whether the dialog surface owns a form submission lifecycle. */
  readonly form?: boolean;
  /** Whether an in-flight task prevents dismiss requests. */
  readonly busy?: boolean;
  /** Whether clicking the modal mask may request dismissal. */
  readonly maskClosable?: boolean;
  /** Whether Escape may request dismissal. */
  readonly closeOnEsc?: boolean;
  /** Whether the component library should move focus into the dialog. */
  readonly autoFocus?: boolean;
  /** Explicit initial field; resolved by the public Dialog after mount. */
  readonly initialFocusEl?: (() => HTMLElement | null) | undefined;
  /** Overlay ownership attributes applied to the visible semantic surface. */
  readonly ownerAttributes?: Readonly<Record<string, string>>;
  /** Optional product class applied to the visible semantic surface. */
  readonly surfaceClass?: string;
  /** Optional task-layout class applied to the scroll-owned body. */
  readonly bodyClass?: string;
}

/** Public slots rendered by the shared Classic task-dialog recipe. */
export interface ClassicEditorTaskDialogSlots {
  /** Task-specific fields, description, and feedback. */
  readonly default: () => unknown;
  /** Optional secondary and primary task actions. */
  readonly actions?: () => unknown;
}
