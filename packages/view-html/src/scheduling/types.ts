import type { QuireChangedRange } from "@quirekit/core";
import type { Mapping, Node as ProseMirrorNode, Transaction } from "@quirekit/pm";
import type { QuireViewMeasuredPhase } from "@quirekit/view/mounted-backend";
import type {
  MountedViewUpdateRequestOptions,
  MountedViewUpdateRevision,
  MountedViewUpdateSchedulerCounters
} from "@quirekit/view/mounted-backend";

/** Ordered phase names owned by the retained HTML renderer. */
export type HtmlRenderPhase =
  | "content-write"
  | "geometry-read"
  | "overlay-write";

/** One update submitted to the retained HTML render scheduler. */
export interface HtmlScheduledUpdate {
  /** Semantic reason for the update. */
  readonly reason: string;
  /** Ordered editor state versions absorbed by this update. */
  readonly stateVersions: readonly number[];
  /** Mounted state/layout revision captured by the latest absorbed request. */
  readonly revision: MountedViewUpdateRevision;
  /** Applied transactions in their original sequential order. */
  readonly transactions?: readonly Transaction[] | undefined;
  /** Whether this update changes only selection presentation. */
  readonly selectionOnly?: boolean | undefined;
  /** Mount-owned data associated with the latest absorbed update. */
  readonly payload?: unknown;
}

/** Phase-scoped capabilities exposed to render callbacks. */
export interface HtmlRenderPhaseContext {
  /** Name of the currently executing phase. */
  readonly phase: HtmlRenderPhase;
  /**
   * Performs a geometry read when the current phase permits it.
   *
   * @param read - DOM geometry read to execute.
   * @returns Value returned by the read.
   */
  readGeometry<T>(read: () => T): T;
  /** Records authorized DOM writes performed at their mutation site. */
  recordContentWrite(): void;
  /** Records one retained reconciliation in this frame. */
  recordReconciliation(): void;
}

/** Diagnostics from the most recently completed HTML render. */
export interface HtmlRenderDiagnostics {
  /** Non-empty measured phases completed by the render. */
  readonly phases: readonly QuireViewMeasuredPhase[];
  /** Shared cadence counters sampled after the render. */
  readonly scheduler: MountedViewUpdateSchedulerCounters;
  /** Number of retained reconciliation passes performed by this render. */
  readonly reconciliationFrames: number;
  /** Number of authorized content writes reported by this render. */
  readonly contentWrites: number;
  /** Number of attempted geometry reads in a write phase. */
  readonly forcedLayoutRisks: number;
  /** Ordered state versions absorbed by the render. */
  readonly stateVersions: readonly number[];
}

/** Result of composing a sequential transaction batch. */
export interface HtmlComposedTransactions {
  /** Final document produced by the transaction sequence. */
  readonly documentNode: ProseMirrorNode;
  /** Mapping from the first transaction's input to the final document. */
  readonly mapping: Mapping;
  /** Changed ranges expressed across the composed transform. */
  readonly changedRanges: readonly QuireChangedRange[];
}

/** Construction options for one retained HTML scheduler. */
export interface CreateHtmlRenderSchedulerOptions<TContent, TGeometry> {
  /**
   * Reads the mounted runtime's newest state/layout revision.
   *
   * @returns Current authoritative revision used to reject obsolete work.
   */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
  /** Performs retained content work for a non-selection update. */
  readonly runContentWrite: (
    update: HtmlScheduledUpdate,
    context: HtmlRenderPhaseContext
  ) => TContent;
  /** Performs all geometry reads for the render. */
  readonly runGeometryRead: (
    update: HtmlScheduledUpdate,
    content: TContent | undefined,
    context: HtmlRenderPhaseContext
  ) => TGeometry;
  /** Performs overlay and presentation writes after geometry is known. */
  readonly runOverlayWrite: (
    update: HtmlScheduledUpdate,
    content: TContent | undefined,
    geometry: TGeometry,
    context: HtmlRenderPhaseContext
  ) => void;
  /** Monotonic clock used to measure phases. */
  readonly now?: (() => number) | undefined;
  /** Optional browser frame request function supplied by the mounted runtime. */
  readonly requestFrame?: ((callback: () => void) => number) | undefined;
  /** Optional browser frame cancellation function supplied by the mounted runtime. */
  readonly cancelFrame?: ((handle: number) => void) | undefined;
  /** Receives each completed render diagnostic snapshot. */
  readonly onRender?: ((diagnostics: HtmlRenderDiagnostics) => void) | undefined;
}

/** Internal retained HTML scheduler lifecycle. */
export interface HtmlRenderScheduler {
  /**
   * Requests a render through the shared mounted-view cadence.
   *
   * @param update - Update payload to render.
   * @param options - Sync or frame execution mode.
   */
  request(
    update: HtmlScheduledUpdate,
    options?: MountedViewUpdateRequestOptions
  ): void;
  /**
   * Flushes pending work and returns the latest diagnostics.
   *
   * @returns Latest diagnostic snapshot.
   */
  flush(): HtmlRenderDiagnostics;
  /** Cancels pending work and rejects future execution. */
  destroy(): void;
  /**
   * Reads the latest diagnostic snapshot.
   *
   * @returns Latest diagnostics with current scheduler counters.
   */
  getDiagnostics(): HtmlRenderDiagnostics;
}
