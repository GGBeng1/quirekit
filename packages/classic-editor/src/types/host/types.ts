/** Stable opaque source identity supplied by one trusted source adapter. */
export interface ClassicEditorHostSourceReference {
  /** Source adapter family; identity only, never an executable action. */
  readonly kind: "file" | "clipboard" | "drop" | "url" | "provider";
  /** Opaque source identity without bytes, paths, or credentials. */
  readonly id: string;
}

/** Stable external resource identity without signed URL or credential. */
export interface ClassicEditorHostResourceReference {
  /** Resource provider capability identity. */
  readonly providerId: string;
  /** Provider-scoped stable resource id. */
  readonly resourceId: string;
}

/** Policy purpose accepted by the finite Host protocol. */
export type ClassicEditorHostResourcePurpose = "image" | "attachment" | "markdown" | "provider-import" | "external-open";

/** Signal-free correlation and policy facts for every Host intent. */
export interface ClassicEditorHostResourceIntentBase {
  /** Physical job identity. */ readonly jobId: string;
  /** Consumer operation identity. */ readonly operationId: string;
  /** Retry attempt. */ readonly attempt: number;
  /** Monotonic generation. */ readonly generation: number;
  /** Static policy purpose. */ readonly purpose: ClassicEditorHostResourcePurpose;
  /** Current authorization/policy revision. */ readonly policyRevision: string;
}

/** Reads one opaque source. */
export interface ClassicEditorHostAcquireIntent extends ClassicEditorHostResourceIntentBase {
  /** Closed protocol discriminator. */ readonly kind: "acquire";
  /** Source snapshot, never a browser event. */ readonly source: ClassicEditorHostSourceReference;
}
/** Resolves one stable resource. */
export interface ClassicEditorHostResolveIntent extends ClassicEditorHostResourceIntentBase {
  /** Closed protocol discriminator. */ readonly kind: "resolve";
  /** Stable resource reference. */ readonly resource: ClassicEditorHostResourceReference;
}
/** Persists one prepared resource. */
export interface ClassicEditorHostUploadIntent extends ClassicEditorHostResourceIntentBase {
  /** Closed protocol discriminator. */ readonly kind: "upload";
  /** Prepared volatile resource identity. */ readonly preparedResourceId: string;
  /** Verified content digest. */ readonly digest: string;
}
/** Performs one explicit external effect. */
export interface ClassicEditorHostOpenIntent extends ClassicEditorHostResourceIntentBase {
  /** Closed protocol discriminator. */ readonly kind: "open";
  /** Stable resource reference. */ readonly resource: ClassicEditorHostResourceReference;
  /** Authorized effect category. */ readonly effect: "external-window" | "download" | "preview";
}
/** Closed signal-free Host intent family. */
export type ClassicEditorHostResourceIntent = ClassicEditorHostAcquireIntent | ClassicEditorHostResolveIntent | ClassicEditorHostUploadIntent | ClassicEditorHostOpenIntent;

/** Immutable progress reported by a Host adapter. */
export interface ClassicEditorHostJobProgress {
  /** Forward-only execution phase. */ readonly phase: "queued" | "acquiring" | "resolving" | "uploading" | "opening" | "result";
  /** Completed bytes for this attempt. */ readonly completedBytes: number;
  /** Total bytes where known. */ readonly totalBytes: number | null;
  /** Current retry attempt. */ readonly attempt: number;
  /** Whether cancellation remains possible. */ readonly canCancel: boolean;
}
/** Progress channel correlated by coordinator identity. */
export interface ClassicEditorHostProgressReporter {
  /** @param progress - Candidate immutable progress snapshot. */
  report(progress: ClassicEditorHostJobProgress): void;
}
/** Adapter request: intent plus coordinator-owned cancellation/progress capabilities. */
export interface ClassicEditorHostAdapterRequest<Intent extends ClassicEditorHostResourceIntent> {
  /** Signal-free typed intent. */ readonly intent: Intent;
  /** Coordinator-owned abort signal. */ readonly signal: AbortSignal;
  /** Correlated progress reporter. */ readonly progress: ClassicEditorHostProgressReporter;
}
/** Public diagnostic required by failed/denied results. */
export interface ClassicEditorHostDiagnostic {
  /** Stable diagnostic code. */ readonly code: string;
  /** Whether retry is admissible. */ readonly retryable: boolean;
}
/** Prepared facts required by resource-operation success. */
export interface ClassicEditorHostPreparedResource {
  /** Stable prepared or persisted identity. */ readonly id: string;
  /** Verified digest. */ readonly digest: string;
  /** Authoritative byte count. */ readonly bytes: number;
  /** Canonical sniffed MIME type. */ readonly mimeType: string;
}
/** Shared correlation for every closed result. */
export interface ClassicEditorHostResultBase<Kind extends ClassicEditorHostResourceIntent["kind"], Outcome extends "success" | "cancelled" | "failed" | "denied"> {
  /** Matching request kind. */ readonly kind: Kind;
  /** Job identity. */ readonly jobId: string;
  /** Consumer operation identity. */ readonly operationId: string;
  /** Producing attempt. */ readonly attempt: number;
  /** Producing generation. */ readonly generation: number;
  /** Closed terminal outcome. */ readonly outcome: Outcome;
}
/** Acquire/resolve/upload success requires prepared resource facts. */
export type ClassicEditorHostPreparedSuccessResult = {
  [Kind in "acquire" | "resolve" | "upload"]: ClassicEditorHostResultBase<Kind, "success"> & { readonly resource: ClassicEditorHostPreparedResource }
}["acquire" | "resolve" | "upload"];
/** Open success has an effect receipt, not a prepared resource. */
export type ClassicEditorHostOpenSuccessResult = ClassicEditorHostResultBase<"open", "success"> & { readonly dispatchId: string };
/** Rejected result always includes a public diagnostic. */
export type ClassicEditorHostRejectedResult = {
  [Kind in ClassicEditorHostResourceIntent["kind"]]: {
    [Outcome in "failed" | "denied"]: ClassicEditorHostResultBase<Kind, Outcome> & { readonly diagnostic: ClassicEditorHostDiagnostic }
  }["failed" | "denied"]
}[ClassicEditorHostResourceIntent["kind"]];
/** Cancelled result deliberately has no prepared resource. */
export type ClassicEditorHostCancelledResult = {
  [Kind in ClassicEditorHostResourceIntent["kind"]]: ClassicEditorHostResultBase<Kind, "cancelled">
}[ClassicEditorHostResourceIntent["kind"]];
/** Closed discriminated Host result union. */
export type ClassicEditorHostResourceResult = ClassicEditorHostPreparedSuccessResult | ClassicEditorHostOpenSuccessResult | ClassicEditorHostRejectedResult | ClassicEditorHostCancelledResult;
/** Result matching acquire intent. */ export type ClassicEditorHostAcquireResult = Extract<ClassicEditorHostResourceResult, { readonly kind: "acquire" }>;
/** Result matching resolve intent. */ export type ClassicEditorHostResolveResult = Extract<ClassicEditorHostResourceResult, { readonly kind: "resolve" }>;
/** Result matching upload intent. */ export type ClassicEditorHostUploadResult = Extract<ClassicEditorHostResourceResult, { readonly kind: "upload" }>;
/** Result matching open intent. */ export type ClassicEditorHostOpenResult = Extract<ClassicEditorHostResourceResult, { readonly kind: "open" }>;
/** Explicit typed Host adapter surface; no string executor exists. */
export interface ClassicEditorHostServices {
  /** @param request - Coordinator-bound acquire request. @returns Matching result. */ acquire(request: ClassicEditorHostAdapterRequest<ClassicEditorHostAcquireIntent>): Promise<ClassicEditorHostAcquireResult>;
  /** @param request - Coordinator-bound resolve request. @returns Matching result. */ resolve(request: ClassicEditorHostAdapterRequest<ClassicEditorHostResolveIntent>): Promise<ClassicEditorHostResolveResult>;
  /** @param request - Coordinator-bound upload request. @returns Matching result. */ upload(request: ClassicEditorHostAdapterRequest<ClassicEditorHostUploadIntent>): Promise<ClassicEditorHostUploadResult>;
  /** @param request - Coordinator-bound open request. @returns Matching result. */ open(request: ClassicEditorHostAdapterRequest<ClassicEditorHostOpenIntent>): Promise<ClassicEditorHostOpenResult>;
}

/** Correlation-safe immutable Host job state. */
export interface ClassicEditorHostJobSnapshot {
  /** Active signal-free intent. */
  readonly intent: ClassicEditorHostResourceIntent;
  /** Latest accepted progress. */
  readonly progress: ClassicEditorHostJobProgress;
  /** Terminal result, or null while execution is pending. */
  readonly result: ClassicEditorHostResourceResult | null;
}

/** Listener notified after one immutable Host snapshot is committed. */
export type ClassicEditorHostJobListener = (
  snapshot: ClassicEditorHostJobSnapshot | null
) => void;

/** Public lifecycle for typed Host jobs without exposing adapter internals. */
export interface ClassicEditorHostResourceController {
  /** Current immutable state, or null before the first job. */
  readonly snapshot: ClassicEditorHostJobSnapshot | null;
  /**
   * Subscribes to immutable Host snapshots without gaining adapter authority.
   *
   * @param listener - Read-only snapshot consumer.
   * @returns Idempotent unsubscribe callback.
   */
  subscribe(listener: ClassicEditorHostJobListener): () => void;
  /**
   * Starts one typed Host intent and supersedes older active work.
   *
   * @param intent - Signal-free typed Host intent.
   * @returns Matching immutable terminal result, or null for stale work.
   */
  start(
    intent: ClassicEditorHostResourceIntent
  ): Promise<ClassicEditorHostResourceResult | null>;
  /**
   * Cancels the exact active correlation tuple.
   *
   * @param intent - Exact active intent identity.
   */
  cancel(intent: ClassicEditorHostResourceIntent): void;
  /**
   * Retries a matching retryable failure with a new attempt and generation.
   *
   * @param intent - Exact terminal intent identity.
   * @returns Matching immutable terminal result, or null when retry is denied.
   */
  retry(
    intent: ClassicEditorHostResourceIntent
  ): Promise<ClassicEditorHostResourceResult | null>;
  /** Aborts pending work and permanently closes this instance-scoped controller. */
  destroy(): void;
}
