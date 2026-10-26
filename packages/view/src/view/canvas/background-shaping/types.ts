import type { QuireEditor } from "@quirekit/core";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type {
  QuireLineBreakerPolicy,
  QuireLineBreakMode
} from "@quirekit/layout/inline";
import type { QuireView } from "../../facade";
import type {
  MountedViewUpdateRevision,
  QuireLayoutJobCoordinatorCounters,
  QuireLayoutJobRejectionReason
} from "../../shared";
import type { QuireBackgroundShapingCompilationGap } from "../../shared/layout-jobs/background-shaping";

/** Options used to create Canvas background shaping orchestration. */
export interface CanvasBackgroundShapingRuntimeOptions {
  /** Mounted editor whose current immutable state is compiled. */
  readonly editor: QuireEditor;
  /** View facade that owns the canonical retained shape cache. */
  readonly view: QuireView;
  /** Local text measurer used by synchronous layout and fallback jobs. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Optional local line-breaker used by synchronous layout and fallback jobs. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Reads current mounted state/layout freshness authority. */
  readonly readCurrentRevision: () => MountedViewUpdateRevision;
  /** Stable mounted view identity used only for local capability diagnostics. */
  readonly runtimeId: string;
}

/** One top-level block window requested by cooperative Canvas fill. */
export interface CanvasBackgroundShapingRequest {
  /** Inclusive first top-level block index. */
  readonly fromIndex: number;
  /** Exclusive last top-level block index. */
  readonly toIndex: number;
  /** Mounted revision captured before compilation. */
  readonly revision: MountedViewUpdateRevision;
  /** Available inline width in CSS pixels. */
  readonly width: number;
  /** Base CSS font inherited by textblocks. */
  readonly font: string;
  /** Whether canonical document heading families participate in node styles. */
  readonly applyDocumentFontTheme?: boolean | undefined;
  /** Base visual line height inherited by textblocks. */
  readonly lineHeight: number;
  /** Base baseline offset inherited by textblocks. */
  readonly textBaselineOffset: number;
  /** Canonical wrapping mode used by synchronous layout. */
  readonly lineBreakMode: QuireLineBreakMode;
}

/** Accepted Canvas background shaping completion. */
export interface CanvasBackgroundShapingAcceptedResult {
  /** Accepted completion discriminator. */
  readonly accepted: true;
  /** Number of shaped blocks attached to the canonical cache. */
  readonly attachedBlockCount: number;
  /** Number of blocks already present in the exact shape cache. */
  readonly cachedBlockCount: number;
  /** Explicit blocks that remain on synchronous canonical layout. */
  readonly gaps: readonly QuireBackgroundShapingCompilationGap[];
}

/** Rejected Canvas background shaping completion. */
export interface CanvasBackgroundShapingRejectedResult {
  /** Rejected completion discriminator. */
  readonly accepted: false;
  /** Coordinator freshness or execution rejection reason. */
  readonly reason: QuireLayoutJobRejectionReason;
  /** Number of blocks already present in the exact shape cache. */
  readonly cachedBlockCount: number;
  /** Explicit blocks that remain on synchronous canonical layout. */
  readonly gaps: readonly QuireBackgroundShapingCompilationGap[];
}

/** Canvas background shaping completion. */
export type CanvasBackgroundShapingResult =
  | CanvasBackgroundShapingAcceptedResult
  | CanvasBackgroundShapingRejectedResult;

/** Internal Canvas background shaping lifecycle. */
export interface CanvasBackgroundShapingRuntime {
  /**
   * Shapes one block window and warms accepted output into retained cache.
   *
   * @param request - Exact block window, layout config, and mounted revision.
   * @returns Accepted attachment or explicit rejection.
   */
  readonly shape: (
    request: CanvasBackgroundShapingRequest
  ) => Promise<CanvasBackgroundShapingResult>;
  /**
   * Reads cumulative coordinator diagnostics.
   *
   * @returns Current layout job counters.
   */
  readonly snapshot: () => QuireLayoutJobCoordinatorCounters;
  /** Cancels active work and releases executor resources. */
  readonly destroy: () => void;
}
