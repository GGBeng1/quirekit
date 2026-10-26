import type { QuireEditor } from "@quirekit/core";
import type { QuireRect } from "@quirekit/renderer";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type {
  QuireLineBreakerPolicy,
  QuireLineBreakMode
} from "@quirekit/layout/inline";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireView } from "../../facade";
import type {
  MountedViewUpdateRevision,
  QuireLayoutJobCoordinatorCounters,
  QuireLayoutJobRejectionReason
} from "../../shared";
import type {
  QuireLayoutJobExecutorDeployment,
  QuireLayoutWorkerClient
} from "../../shared/layout-jobs/worker";

/** Options used to create Canvas remainder pagination orchestration. */
export interface CanvasRemainderPaginationRuntimeOptions {
  /** Mounted editor whose current immutable state is compiled. */
  readonly editor: QuireEditor;
  /** View facade owning canonical retained products. */
  readonly view: QuireView;
  /** Local text measurer matching synchronous layout. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Optional local line-breaker matching synchronous layout. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Reads current mounted state/layout freshness authority. */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
  /** Stable mounted runtime identity. */
  readonly runtimeId: string;
  /** @returns Optional internal Worker transport created by the mounted host. */
  readonly createWorkerClient?: (() => QuireLayoutWorkerClient) | undefined;
}

/** Diagnostics exposed by the remainder pagination accelerator. */
export interface CanvasRemainderPaginationRuntimeSnapshot
  extends QuireLayoutJobCoordinatorCounters {
  /** Active execution location and explicit fallback reason. */
  readonly deployment: QuireLayoutJobExecutorDeployment;
}

/** One complete remainder page-drive request. */
export interface CanvasRemainderPaginationRequest {
  /** Mounted revision captured before main-thread compilation. */
  readonly revision: MountedViewUpdateRevision;
  /** Viewport rectangle used by canonical infinite layout. */
  readonly viewportRect: QuireRect;
  /** Page geometry consumed by canonical page driving. */
  readonly pageGeometry: QuirePageGeometry;
  /** Explicit host CSS font; omission enables the canonical document theme. */
  readonly font?: string | undefined;
  /** Base baseline offset inherited by textblocks. */
  readonly textBaselineOffset: number;
  /** Canonical wrapping mode. */
  readonly lineBreakMode: QuireLineBreakMode;
  /** Minimum lines retained at a page top. */
  readonly widows?: number | undefined;
  /** Minimum lines retained at a page bottom. */
  readonly orphans?: number | undefined;
}

/** Accepted remainder pagination result. */
export interface CanvasRemainderPaginationAcceptedResult {
  /** Accepted completion discriminator. */
  readonly accepted: true;
  /** Number of pages attached to retained prepared-result authority. */
  readonly attachedPageCount: number;
}

/** Rejected remainder pagination result. */
export interface CanvasRemainderPaginationRejectedResult {
  /** Rejected completion discriminator. */
  readonly accepted: false;
  /** Stable coordinator rejection reason. */
  readonly reason: QuireLayoutJobRejectionReason;
}

/** Remainder pagination completion. */
export type CanvasRemainderPaginationResult =
  | CanvasRemainderPaginationAcceptedResult
  | CanvasRemainderPaginationRejectedResult;

/** Internal Canvas remainder pagination lifecycle. */
export interface CanvasRemainderPaginationRuntime {
  /**
   * Compiles and drives the fully shaped document remainder.
   *
   * @param request - Current geometry, policy, and freshness facts.
   * @returns Accepted prepared result or explicit rejection.
   */
  readonly paginate: (
    request: CanvasRemainderPaginationRequest
  ) => Promise<CanvasRemainderPaginationResult>;
  /** @returns Current coordinator counters and deployment diagnostics. */
  readonly snapshot: () => CanvasRemainderPaginationRuntimeSnapshot;
  /** Cancels active work and releases executor resources. */
  readonly destroy: () => void;
}
