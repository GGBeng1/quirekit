import type { ClassicEditorHostResourcePurpose } from "../host";
import type {
  ClassicEditorTaskDiagnostic,
  ClassicEditorTaskHandle,
  ClassicEditorTaskProgress,
  ClassicEditorTaskPhase
} from "../tasks";

/** Non-terminal phases a resource workflow may publish. */
export type ClassicEditorHostResourceTaskPhase = Extract<
  ClassicEditorTaskPhase,
  "choosing" | "uploading" | "processing"
>;

/** Correlated progress update emitted from one active resource attempt. */
export interface ClassicEditorHostResourceTaskUpdate {
  /** Next non-terminal workflow phase. */
  readonly phase: ClassicEditorHostResourceTaskPhase;
  /** Optional already-redacted localized label. */
  readonly label?: string | undefined;
  /** Optional monotonic progress. */
  readonly progress?: ClassicEditorTaskProgress | null | undefined;
}

/** Capabilities supplied to one private resource-workflow attempt. */
export interface ClassicEditorHostResourceTaskAttempt {
  /** Exact attempt and generation correlation tuple. */
  readonly handle: ClassicEditorTaskHandle;
  /** Controller-owned cancellation signal. */
  readonly signal: AbortSignal;
  /**
   * Publishes one correlation-safe non-terminal update.
   *
   * @param update - Redacted lifecycle and progress facts.
   * @returns Whether the current generation accepted the update.
   */
  update(update: ClassicEditorHostResourceTaskUpdate): boolean;
  /**
   * Runs the final feature-owned document command in a cancellation-excluded section.
   *
   * @param operation - Synchronous final command returning whether it committed.
   * @returns Whether the current generation executed and committed the operation.
   */
  commit(operation: () => boolean): boolean;
}

/** Successful private resource-workflow result. */
export interface ClassicEditorHostResourceTaskSuccess {
  /** Closed result discriminator. */
  readonly outcome: "success";
}

/** Explicitly cancelled private resource-workflow result. */
export interface ClassicEditorHostResourceTaskCancelled {
  /** Closed result discriminator. */
  readonly outcome: "cancelled";
}

/** Failed private resource-workflow result with public-safe diagnostics. */
export interface ClassicEditorHostResourceTaskFailed {
  /** Closed result discriminator. */
  readonly outcome: "failed";
  /** Already-redacted diagnostics eligible for task feedback projection. */
  readonly diagnostics: readonly ClassicEditorTaskDiagnostic[];
}

/** Closed result union returned by resource workflow owners. */
export type ClassicEditorHostResourceTaskResult =
  | ClassicEditorHostResourceTaskSuccess
  | ClassicEditorHostResourceTaskCancelled
  | ClassicEditorHostResourceTaskFailed;

/** Complete input retained privately for initial execution and retry. */
export interface ClassicEditorHostResourceTaskInput {
  /** Caller-owned instance-local task identity. */
  readonly taskId: string;
  /** Host policy purpose projected without source identity. */
  readonly purpose: ClassicEditorHostResourcePurpose;
  /** First visible resource-processing phase. */
  readonly phase: ClassicEditorHostResourceTaskPhase;
  /** Optional already-redacted localized task label. */
  readonly label?: string | undefined;
  /** Terminal phase after a successful commit. */
  readonly successPhase?: Extract<ClassicEditorTaskPhase, "inserted" | "completed"> | undefined;
  /**
   * Executes one private attempt without publishing source data.
   *
   * @param attempt - Correlated update, cancellation, and commit capabilities.
   * @returns Closed attempt result.
   */
  readonly run: (
    attempt: ClassicEditorHostResourceTaskAttempt
  ) => ClassicEditorHostResourceTaskResult | Promise<ClassicEditorHostResourceTaskResult>;
}
