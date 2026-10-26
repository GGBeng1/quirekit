import type { ClassicEditorHostResourcePurpose } from "../host";

/** Product operation families projected by the shared task surface. */
export type ClassicEditorTaskKind =
  | "creation"
  | "upload"
  | "export"
  | "conversion"
  | "import"
  | "host";

/** Closed user-visible task lifecycle shared by creation and background work. */
export type ClassicEditorTaskPhase =
  | "ready"
  | "choosing"
  | "placing"
  | "uploading"
  | "processing"
  | "inserted"
  | "completed"
  | "cancelled"
  | "error";

/** Creation object families tracked by the typed authoring lifecycle. */
export type ClassicEditorCreationKind =
  | "image"
  | "text-box"
  | "attachment"
  | "table"
  | "content-control"
  | "link";

/** Public progress fact without source bytes, file paths, or credentials. */
export interface ClassicEditorTaskProgress {
  /** Completed units for the current attempt. */
  readonly completed: number;
  /** Total units where the Host knows the bound. */
  readonly total: number | null;
  /** Unit used by the accessible progress label. */
  readonly unit: "bytes" | "items";
}

/** Redacted diagnostic projected into task details. */
export interface ClassicEditorTaskDiagnostic {
  /** Stable public diagnostic code. */
  readonly code: string;
  /** Whether a fresh attempt is admissible. */
  readonly retryable: boolean;
  /** Optional already-redacted product message. */
  readonly message?: string | undefined;
  /** Optional already-redacted structural location. */
  readonly path?: string | undefined;
}

/** Exact correlation tuple required for any task update. */
export interface ClassicEditorTaskHandle {
  /** Instance-local task identity. */
  readonly taskId: string;
  /** Current attempt identity. */
  readonly attempt: number;
  /** Current generation identity. */
  readonly generation: number;
}

/** Immutable task record consumed by task feedback presenters. */
export interface ClassicEditorTaskRecord extends ClassicEditorTaskHandle {
  /** Product operation family. */
  readonly kind: ClassicEditorTaskKind;
  /** Current closed lifecycle phase. */
  readonly phase: ClassicEditorTaskPhase;
  /** Optional creation object family. */
  readonly creationKind: ClassicEditorCreationKind | null;
  /** Optional Host policy purpose without source or resource identity. */
  readonly hostPurpose: ClassicEditorHostResourcePurpose | null;
  /** Optional already-redacted localized label supplied by a product workflow. */
  readonly label: string | null;
  /** Latest monotonic progress, when relevant. */
  readonly progress: ClassicEditorTaskProgress | null;
  /** Current public diagnostics available to approved feedback surfaces. */
  readonly diagnostics: readonly ClassicEditorTaskDiagnostic[];
  /** Whether an explicit cancel request is currently accepted. */
  readonly canCancel: boolean;
  /** Whether an explicit retry request is currently accepted. */
  readonly canRetry: boolean;
  /** Whether the transient toast has been dismissed. */
  readonly toastDismissed: boolean;
  /** Stable creation order used by task snapshot consumers. */
  readonly sequence: number;
}

/** Read-only instance task snapshot. */
export interface ClassicEditorTaskFeedbackSnapshot {
  /** Monotonic snapshot revision. */
  readonly revision: number;
  /** All retained tasks in creation order. */
  readonly tasks: readonly ClassicEditorTaskRecord[];
}

/** Input for one explicit creation lifecycle. */
export interface ClassicEditorCreationTaskInput {
  /** Caller-owned instance-local identity. */
  readonly taskId: string;
  /** Semantic object being created. */
  readonly creationKind: ClassicEditorCreationKind;
  /** Initial lifecycle phase, normally ready before a picker or placement starts. */
  readonly phase?: Extract<ClassicEditorTaskPhase, "ready" | "choosing" | "placing" | "uploading"> | undefined;
}

/** Input for one background product task not owned by the Host resource protocol. */
export interface ClassicEditorBackgroundTaskInput {
  /** Caller-owned instance-local identity. */
  readonly taskId: string;
  /** Background operation family. */
  readonly kind: Exclude<ClassicEditorTaskKind, "creation" | "host">;
  /** First visible lifecycle phase. */
  readonly phase: Extract<ClassicEditorTaskPhase, "ready" | "uploading" | "processing">;
  /** Optional already-redacted localized task label. */
  readonly label?: string | undefined;
}

/** Input for one resource workflow projected through TaskFeedback. */
export interface ClassicEditorResourceTaskFeedbackInput {
  /** Caller-owned instance-local identity. */
  readonly taskId: string;
  /** Policy purpose without source bytes or resource credentials. */
  readonly purpose: ClassicEditorHostResourcePurpose;
  /** First visible resource-processing phase. */
  readonly phase: Extract<ClassicEditorTaskPhase, "choosing" | "uploading" | "processing">;
  /** Optional already-redacted localized task label. */
  readonly label?: string | undefined;
}

/** Correlated task update published by the workflow owner. */
export interface ClassicEditorTaskUpdate {
  /** Next valid lifecycle phase. */
  readonly phase: ClassicEditorTaskPhase;
  /** Optional already-redacted localized label for this visible state. */
  readonly label?: string | undefined;
  /** Optional monotonic progress. */
  readonly progress?: ClassicEditorTaskProgress | null | undefined;
  /** Optional redacted public diagnostics. */
  readonly diagnostics?: readonly ClassicEditorTaskDiagnostic[] | undefined;
  /** Whether cancellation remains meaningful. */
  readonly canCancel?: boolean | undefined;
}

/** Side-effect ports retained outside immutable task snapshots. */
export interface ClassicEditorTaskActionPort {
  /** Requests cancellation through the owning typed workflow. */
  readonly cancel?: ((handle: ClassicEditorTaskHandle) => void | Promise<void>) | undefined;
  /** Requests a fresh attempt and receives its exact correlation handle. */
  readonly retry?: ((handle: ClassicEditorTaskHandle) => void | Promise<void>) | undefined;
}
