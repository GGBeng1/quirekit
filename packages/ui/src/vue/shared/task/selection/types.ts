import type { QuireKitTaskCancelReason, QuireKitTaskCloseRequest, QuireKitTaskPresentation, QuireKitTaskRequestContext, QuireKitTaskSearchRequest } from "../../../../components/task/types";
import type { TaskRequests } from "../session/request-types";

/** Structural candidate shared by choice and preview tasks. */
export interface TaskSelectionItem {
  /** Stable candidate identity. */
  readonly value: string;
  /** Accessible candidate label. */
  readonly label: string;
  /** Prevents adding an unavailable candidate. */
  readonly disabled?: boolean;
  /** Optional additional local search terms. */
  readonly keywords?: readonly string[];
}

/** Shared immutable business submission shape. */
export interface TaskSelectionRequest extends QuireKitTaskRequestContext {
  /** Complete candidate selection. */
  readonly value: readonly string[];
  /** Baseline captured when submission started. */
  readonly previousValue: readonly string[];
}

/** Structural live inputs, with no ownership of a widget or a presentation. */
export interface TaskSelectionProps<T extends TaskSelectionItem> {
  /** Current remote or local candidates. */
  readonly items: readonly T[];
  /** Controlled committed value. */
  readonly modelValue?: readonly string[] | undefined;
  /** Initial locally owned committed value. */
  readonly defaultValue?: readonly string[] | undefined;
  /** Single or multiple selection. */
  readonly selectionMode?: "single" | "multiple" | undefined;
  /** Explicit confirmation or single activation. */
  readonly commitMode?: "immediate" | "explicit" | undefined;
  /** Controlled query. */
  readonly query?: string | undefined;
  /** Initial query of each session. */
  readonly defaultQuery?: string | undefined;
  /** Local matching mode. */
  readonly filter?: "contains" | "startsWith" | "none" | undefined;
  /** Host availability. */
  readonly disabled?: boolean | undefined;
  /**
   * Runs one accepted submission.
   * @param request - Snapshot carrying current request ownership.
   * @returns Business completion, optionally asynchronous.
   */
  readonly submit?: ((request: TaskSelectionRequest) => void | Promise<void>) | undefined;
}

/** Notifications kept separate from host business execution. */
export interface TaskSelectionEvents {
  /** @param value - Requested committed value. */
  updateValue(value: readonly string[]): void;
  /** @param request - Successfully submitted snapshot. */
  commit(request: TaskSelectionRequest): void;
  /** @param details - Current submission rejection and identity. */
  error(details: { readonly error: unknown; readonly request: TaskSelectionRequest }): void;
  /** @param query - Complete query requested by ordinary or IME input. */
  updateQuery(query: string): void;
  /** @param request - Latest query identity; prior search has been aborted. */
  search(request: QuireKitTaskSearchRequest): void;
  /** Requests successful task closure after releasing the submission lock. */
  success(): void;
}

/** Parameters shared by selection and preset task controllers. */
export interface TaskSelectionOptions<T extends TaskSelectionItem> {
  /** Reactive structural host contract. */
  readonly props: TaskSelectionProps<T>;
  /** Existing session and independent request lanes. */
  readonly requests: TaskRequests;
  /** Sole outward notification owner. */
  readonly events: TaskSelectionEvents;
}

/** Shared selection surface inputs, independent from Choice or Preset decoration. */
export interface TaskSelectionSurfaceProps<T extends TaskSelectionItem> extends TaskSelectionProps<T> {
  /** Accessible task title. */
  readonly title: string;
  /** Host presentation strategy. */
  readonly presentation?: QuireKitTaskPresentation | undefined;
  /** Controlled opening request. */
  readonly open?: boolean | undefined;
  /** Initial local opening request. */
  readonly defaultOpen?: boolean | undefined;
  /** Whether keyboard opening may focus the query field. */
  readonly searchable?: boolean | undefined;
  /** Explicit destination after closing. */
  readonly finalFocusEl?: (() => HTMLElement | null) | undefined;
  /** Synchronous host close guard. */
  readonly onCloseRequest?: ((request: QuireKitTaskCloseRequest) => void) | undefined;
}

/** Shared surface notifications; successful closure is owned inside this runtime. */
export interface TaskSelectionSurfaceEvents extends Omit<TaskSelectionEvents, "success"> {
  /** @param value - Controlled opening request. */
  updateOpen(value: boolean): void;
  /** @param value - Actual active session visibility. */
  openChange(value: boolean): void;
  /** @param details - Discarded session identity and cause. */
  cancel(details: { readonly reason: QuireKitTaskCancelReason; readonly sessionId: string }): void;
}
