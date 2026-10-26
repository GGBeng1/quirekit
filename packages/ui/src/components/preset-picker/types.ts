import type { QuireKitPresetGalleryItem } from "../preset-gallery/types";
import type { QuireKitTaskCloseRequest, QuireKitTaskPresentation, QuireKitTaskRequestContext } from "../task/types";

/** Adaptive task for previewing and submitting one visual preset. */
export interface QuireKitPresetPickerProps {
  /** Visible task title and accessible dialog name. */
  readonly title: string;
  /** Optional explanation displayed beside the task title. */
  readonly description?: string | undefined;
  /** Existing Gallery items with stable values and decorative preview data. */
  readonly items: readonly QuireKitPresetGalleryItem[];
  /** Controlled committed preset; null explicitly clears the selection. */
  readonly modelValue?: string | null | undefined;
  /** Initial uncontrolled preset; omitted and null both start without a selection. */
  readonly defaultValue?: string | null | undefined;
  /** Explicit confirmation by default; immediate submits an activated preset. */
  readonly commitMode?: "explicit" | "immediate" | undefined;
  /** Opening-time presentation strategy, defaulting to the layout viewport. */
  readonly presentation?: QuireKitTaskPresentation | undefined;
  /** Controlled open request; false takes priority over defaultOpen. */
  readonly open?: boolean | undefined;
  /** Initial uncontrolled open request. */
  readonly defaultOpen?: boolean | undefined;
  /** Prevents opening or selection and ends any active task. */
  readonly disabled?: boolean | undefined;
  /** Maximum Gallery column count; defaults to four. */
  readonly maxColumns?: number | undefined;
  /** Gallery's ideal minimum item width; narrow containers may shrink further. */
  readonly minItemWidth?: string | undefined;
  /** Task-specific confirmation action name; defaults to the language pack's generic text. */
  readonly confirmLabel?: string | undefined;
  /** Task-specific message after the current submission fails; defaults to the language pack's generic text. */
  readonly errorText?: string | undefined;
  /** Explicit final focus destination; otherwise uses the persistent trigger. */
  readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
  /** Synchronous cancellable user-close callback. */
  readonly onCloseRequest?: ((request: QuireKitTaskCloseRequest) => void) | undefined;
  /**
   * Sole business submission entry; commit only reports successful completion.
   * @param request - Immutable single-value proposal and its cancellation identity.
   * @returns Completion, optionally asynchronous; rejection retains the draft for retry.
   */
  readonly submit?: ((request: QuireKitPresetSubmitRequest) => void | Promise<void>) | undefined;
}

/** Immutable single-preset proposal submitted by one active task session. */
export interface QuireKitPresetSubmitRequest extends QuireKitTaskRequestContext {
  /** Proposed preset, or null for an empty selection. */
  readonly value: string | null;
  /** Committed preset when this submission began. */
  readonly previousValue: string | null;
}
