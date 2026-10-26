import type { QuireLayoutDirtyRange } from "@quirekit/view-engine";
import type { MountedViewUpdateRevision } from "../update-scheduler";

/** Layout work kinds allowed behind the versioned acceleration boundary. */
export type QuireLayoutJobKind =
  | "background-shaping"
  | "remainder-pagination"
  | "page-raster";

/** Clone-safe block or page window owned by one layout job. */
export type QuireLayoutJobWindow =
  | {
      /** Block-index window. */
      readonly kind: "blocks";
      /** Inclusive first top-level block index. */
      readonly fromIndex: number;
      /** Exclusive last top-level block index. */
      readonly toIndex: number;
    }
  | {
      /** Page-index window. */
      readonly kind: "pages";
      /** Inclusive first page index. */
      readonly fromIndex: number;
      /** Exclusive last page index. */
      readonly toIndex: number;
    };

/** Clone-safe retained cache identities offered to one layout job. */
export interface QuireLayoutJobCacheHints {
  /** Retained top-level block keys already available to the requester. */
  readonly retainedBlockKeys: readonly string[];
  /** Pagination checkpoint keys eligible for reuse. */
  readonly paginationCheckpointKeys: readonly string[];
  /** Retained table product keys eligible for reuse. */
  readonly tableProductKeys: readonly string[];
}

/** Versioned request envelope shared by main-thread and Worker executors. */
export interface QuireLayoutJobRequest<Payload = unknown> {
  /** Exact protocol version used to encode this request. */
  readonly protocolVersion: number;
  /** Stable job id unique within one mounted runtime. */
  readonly jobId: string;
  /** Scope in which a newer job supersedes an older job. */
  readonly supersessionScope: string;
  /** Pure work category handled by the executor. */
  readonly kind: QuireLayoutJobKind;
  /** Mounted editor-state version captured at submission. */
  readonly stateVersion: number;
  /** Mounted layout-input epoch captured at submission. */
  readonly layoutEpoch: number;
  /** Canonical dirty range that caused the job, or null for initial/background work. */
  readonly dirtyRange: QuireLayoutDirtyRange | null;
  /** Exact block or page window the job may compute. */
  readonly window: QuireLayoutJobWindow;
  /** Stable retained products the executor may reuse. */
  readonly cacheHints: QuireLayoutJobCacheHints;
  /** Job-kind-owned structured-clone payload. */
  readonly payload: Payload;
}

/** Successful layout job result carrying renderer-neutral output. */
export interface QuireLayoutJobSuccessResult<Output = unknown> {
  /** Successful completion discriminator. */
  readonly status: "success";
  /** Protocol version echoed by the executor. */
  readonly protocolVersion: number;
  /** Completed request id. */
  readonly jobId: string;
  /** Editor-state version used for computation. */
  readonly stateVersion: number;
  /** Layout epoch used for computation. */
  readonly layoutEpoch: number;
  /** Job-kind-owned renderer-neutral output. */
  readonly output: Output;
}

/** Canceled layout job result. */
export interface QuireLayoutJobCanceledResult {
  /** Canceled completion discriminator. */
  readonly status: "canceled";
  /** Protocol version echoed by the executor. */
  readonly protocolVersion: number;
  /** Canceled request id. */
  readonly jobId: string;
  /** Editor-state version used for computation. */
  readonly stateVersion: number;
  /** Layout epoch used for computation. */
  readonly layoutEpoch: number;
}

/** Failed layout job result with a clone-safe diagnostic. */
export interface QuireLayoutJobFailedResult {
  /** Failed completion discriminator. */
  readonly status: "failed";
  /** Protocol version echoed by the executor. */
  readonly protocolVersion: number;
  /** Failed request id. */
  readonly jobId: string;
  /** Editor-state version used for computation. */
  readonly stateVersion: number;
  /** Layout epoch used for computation. */
  readonly layoutEpoch: number;
  /** Stable machine-readable failure code. */
  readonly code:
    | "capability-mismatch"
    | "executor-error"
    | "invalid-payload"
    | "transport-error"
    | "unsupported-job-kind";
  /** Human-readable failure detail for diagnostics. */
  readonly message: string;
}

/** Result returned by any layout job executor. */
export type QuireLayoutJobResult<Output = unknown> =
  | QuireLayoutJobSuccessResult<Output>
  | QuireLayoutJobCanceledResult
  | QuireLayoutJobFailedResult;

/** Executor used by the coordinator without owning freshness authority. */
export interface QuireLayoutJobExecutor {
  /**
   * Submits one versioned request.
   *
   * @param request - Clone-safe layout job request.
   * @returns Eventually completed job result.
   */
  readonly submit: (request: QuireLayoutJobRequest) => Promise<QuireLayoutJobResult>;
  /**
   * Requests cancellation for one active job.
   *
   * @param jobId - Active job id to cancel.
   */
  readonly cancel: (jobId: string) => void;
  /** Cancels all active work and releases executor resources. */
  readonly destroy: () => void;
}

/** Why the main-thread coordinator rejected a completed result. */
export type QuireLayoutJobRejectionReason =
  | "canceled"
  | "destroyed"
  | "failed"
  | "invalid-result"
  | "protocol-mismatch"
  | "stale-layout"
  | "stale-state"
  | "superseded";

/** Coordinator outcome after applying freshness and supersession authority. */
export type QuireLayoutJobCoordinationOutcome<Output = unknown> =
  | {
      /** Accepted completion discriminator. */
      readonly accepted: true;
      /** Fresh successful executor result. */
      readonly result: QuireLayoutJobSuccessResult<Output>;
    }
  | {
      /** Rejected completion discriminator. */
      readonly accepted: false;
      /** Stable rejection reason. */
      readonly reason: QuireLayoutJobRejectionReason;
      /** Executor result that was rejected. */
      readonly result: QuireLayoutJobResult<Output>;
    };

/** Cumulative job coordinator diagnostics. */
export interface QuireLayoutJobCoordinatorCounters {
  /** Requests submitted to the executor. */
  readonly submitted: number;
  /** Executor results observed. */
  readonly completed: number;
  /** Fresh successful results accepted. */
  readonly accepted: number;
  /** Active jobs canceled by supersession or destroy. */
  readonly cancellationRequests: number;
  /** Canceled results observed. */
  readonly canceled: number;
  /** Failed results observed. */
  readonly failed: number;
  /** Results rejected for unsupported protocol versions. */
  readonly protocolMismatches: number;
  /** Results whose echoed identity did not match the submitted job. */
  readonly invalidResults: number;
  /** Results rejected because editor state advanced. */
  readonly staleStateResults: number;
  /** Results rejected because layout inputs advanced. */
  readonly staleLayoutResults: number;
  /** Results rejected because a newer job owns the same scope. */
  readonly supersededResults: number;
  /** Results rejected after coordinator destruction. */
  readonly destroyedResults: number;
}

/** Options for one main-thread layout job coordinator. */
export interface QuireLayoutJobCoordinatorOptions {
  /** Executor that performs requests but does not decide freshness. */
  readonly executor: QuireLayoutJobExecutor;
  /** Reads the current mounted state/layout revision. */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
}

/** Main-thread freshness and supersession authority for layout jobs. */
export interface QuireLayoutJobCoordinator {
  /**
   * Submits a request and accepts only a still-current result.
   *
   * @param request - Versioned layout job request.
   * @returns Accepted or rejected completion outcome.
   */
  readonly submit: (
    request: QuireLayoutJobRequest
  ) => Promise<QuireLayoutJobCoordinationOutcome>;
  /**
   * Reads cumulative coordinator diagnostics.
   *
   * @returns Current coordinator counters.
   */
  readonly snapshot: () => QuireLayoutJobCoordinatorCounters;
  /** Cancels active jobs and rejects later completions. */
  readonly destroy: () => void;
}

/** Handler map used by the asynchronous main-thread fallback executor. */
export type QuireMainThreadLayoutJobHandlers = Partial<Record<
  QuireLayoutJobKind,
  (request: QuireLayoutJobRequest) => unknown | Promise<unknown>
>>;
