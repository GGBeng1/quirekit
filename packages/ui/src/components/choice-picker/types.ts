import type { QuireKitTaskCloseRequest, QuireKitTaskPresentation, QuireKitTaskRequestContext } from "../task/types";

/** Stable selectable item, independent from its current search visibility. */
export interface QuireKitChoicePickerItem {
  /** Non-empty identity unique in the current collection. */
  readonly value: string;
  /** Visible and accessible item name. */
  readonly label: string;
  /** Optional secondary explanation. */
  readonly description?: string;
  /** Prevents adding this item while retaining existing committed values. */
  readonly disabled?: boolean;
  /** Optional visible group name. */
  readonly group?: string;
  /** Additional terms consumed by local filtering. */
  readonly keywords?: readonly string[];
}

/** Immutable selection submitted through the sole business callback. */
export interface QuireKitChoiceSubmitRequest extends QuireKitTaskRequestContext {
  /** Proposed complete value snapshot. */
  readonly value: readonly string[];
  /** Committed value when this submission began. */
  readonly previousValue: readonly string[];
}

/** Public selection, search, and adaptive surface inputs. */
export interface QuireKitChoicePickerBaseProps {
  /** Visible task title and accessible dialog name. */
  readonly title: string;
  /** Optional task explanation. */
  readonly description?: string;
  /** Known candidates; remote filtering never implicitly removes selected values. */
  readonly items: readonly QuireKitChoicePickerItem[];
  /** Controlled selection; undefined enables local ownership. */
  readonly modelValue?: readonly string[] | undefined;
  /** Initial uncontrolled selection. */
  readonly defaultValue?: readonly string[];
  /** Opening-time presentation strategy. */
  readonly presentation?: QuireKitTaskPresentation;
  /** Controlled open request; explicit false takes priority over defaultOpen. */
  readonly open?: boolean | undefined;
  /** Initial uncontrolled open request. */
  readonly defaultOpen?: boolean;
  /** Prevents opening and ends any active selection session. */
  readonly disabled?: boolean;
  /** Shows a separately labelled search input. */
  readonly searchable?: boolean;
  /** Controlled query; undefined enables local session ownership. */
  readonly query?: string | undefined;
  /** Initial query for each new uncontrolled session. */
  readonly defaultQuery?: string;
  /** Local matching strategy; none delegates matching to the host. */
  readonly filter?: "contains" | "startsWith" | "none";
  /** Host-owned search progress; does not start a request automatically. */
  readonly loading?: boolean;
  /** Host-owned readable search failure. */
  readonly searchError?: string;
  /** Task-specific confirmation action name; defaults to the language pack's generic text. */
  readonly confirmLabel?: string;
  /** Task-specific submission failure message; defaults to the language pack's generic text. */
  readonly errorText?: string;
  /** Explicit final focus destination; otherwise uses the stable trigger. */
  readonly finalFocusEl?: () => HTMLElement | null;
  /** Synchronous cancellable user-close callback. */
  readonly onCloseRequest?: (request: QuireKitTaskCloseRequest) => void;
  /**
   * Sole business submission entry; commit only reports success.
   * @param request - Immutable selection snapshot and cancellation identity.
   * @returns Completion; rejection retains the current draft and query for retry.
   */
  readonly submit?: (request: QuireKitChoiceSubmitRequest) => void | Promise<void>;
}

/** Single selection may commit immediately or wait for explicit confirmation. */
export interface QuireKitChoicePickerSingleProps extends QuireKitChoicePickerBaseProps {
  /** Single selection is the default. */
  readonly selectionMode?: "single";
  /** Immediate by default; explicit retains a draft until confirmation. */
  readonly commitMode?: "immediate" | "explicit";
}

/** Multiple selection always uses an explicit confirmation boundary. */
export interface QuireKitChoicePickerMultipleProps extends QuireKitChoicePickerBaseProps {
  /** Enables multiple draft selections. */
  readonly selectionMode: "multiple";
  /** Multiple selection cannot commit on each activation. */
  readonly commitMode?: "explicit";
}

/** Compatible selection and commit modes for one adaptive task. */
export type QuireKitChoicePickerProps = QuireKitChoicePickerSingleProps | QuireKitChoicePickerMultipleProps;

/** Decorative option content; the Listbox retains its option and keyboard behavior. */
export interface QuireKitChoicePickerItemSlotProps {
  /** Current known item. */
  readonly item: QuireKitChoicePickerItem;
  /** Whether the item belongs to the current draft. */
  readonly selected: boolean;
  /** Keyboard highlight, independent from selection. */
  readonly highlighted: boolean;
  /** Whether the item is unavailable for activation. */
  readonly disabled: boolean;
}
