import type { QuireTextBaseDirection } from "@quirekit/renderer";
import type { Node as ProseMirrorNode } from "@quirekit/pm";
import type {
  QuireEditor,
  QuireMarkCanvasStyleResolver,
  QuireNodeCanvasTextStyleResolver
} from "@quirekit/core";
import type { CanvasBlockShapeCache } from "@quirekit/view-engine";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type {
  QuireLineBreakerPolicy,
  QuireLineBreakMode,
  QuireInlineTextRun
} from "@quirekit/layout/inline";
import type { QuireTextFragment } from "@quirekit/layout/text";

/** Clone-safe text measurement and shaping capability required by one job. */
export interface QuireBackgroundShapingMeasurementCapability {
  /** Stable runtime-defined measurer identity. */
  readonly id: string;
  /** Monotonic capability version that changes with measurement output. */
  readonly version: number;
  /** Whether the runtime only measures advances or also supplies cluster shaping. */
  readonly mode: "measure-only" | "cluster-shaping";
  /** Whether an equivalent implementation is initialized inside a Worker. */
  readonly transferability: "local-only" | "worker-ready";
}

/** Clone-safe capabilities required to execute background shaping. */
export interface QuireBackgroundShapingCapabilitySnapshot {
  /** Exact text measurement capability expected by the payload. */
  readonly measurement: QuireBackgroundShapingMeasurementCapability;
  /** Active line-breaker policy name, or null for the canonical baseline policy. */
  readonly lineBreakerName: string | null;
}

/** Runtime capabilities used by the background shaping fallback handler. */
export interface QuireBackgroundShapingJobHandlerOptions {
  /** Clone-safe identity describing the local measurement implementation. */
  readonly capabilities: QuireBackgroundShapingCapabilitySnapshot;
  /** Local text measurer represented by the capability snapshot. */
  readonly textMeasurer: QuireTextMeasurer;
  /** Local line-breaker represented by the capability snapshot, when any. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
}

/** One pre-resolved textblock that can be shaped without editor or extension state. */
export interface QuireBackgroundShapingBlockInput {
  /** Request-local key used by the main thread to reattach output to node identity. */
  readonly attachmentKey: string;
  /** Stable fragment id prefix owned by the source textblock. */
  readonly id: string;
  /** Mark- and node-style-resolved inline runs in document order. */
  readonly runs: readonly QuireInlineTextRun[];
  /** Available textblock width in CSS pixels. */
  readonly width: number;
  /** Resolved visual line height in CSS pixels. */
  readonly lineHeight: number;
  /** Resolved baseline offset from the textblock top. */
  readonly textBaselineOffset: number;
  /** Canonical inline wrapping mode. */
  readonly lineBreakMode: QuireLineBreakMode;
  /** Resolved paragraph base direction. */
  readonly baseDirection: QuireTextBaseDirection;
}

/** Structured-clone payload for one background shaping job. */
export interface QuireBackgroundShapingJobPayload {
  /** Exact runtime capabilities under which output remains valid. */
  readonly capabilities: QuireBackgroundShapingCapabilitySnapshot;
  /** Pre-resolved textblocks to shape. */
  readonly blocks: readonly QuireBackgroundShapingBlockInput[];
}

/** Shaped output for one request-local textblock attachment. */
export interface QuireBackgroundShapingBlockOutput {
  /** Request-local key echoed from the input block. */
  readonly attachmentKey: string;
  /** Renderer-neutral wrapped text fragments. */
  readonly fragments: readonly QuireTextFragment[];
}

/** Renderer-neutral output returned by one background shaping job. */
export interface QuireBackgroundShapingJobOutput {
  /** Shaped blocks in input order. */
  readonly blocks: readonly QuireBackgroundShapingBlockOutput[];
}

/** Main-thread attachment identity paired with one clone-safe shaping block. */
export interface QuireBackgroundShapingAttachmentInput {
  /** Immutable ProseMirror node retained only on the main thread. */
  readonly node: ProseMirrorNode;
  /** Clone-safe block input sent to the executor. */
  readonly block: QuireBackgroundShapingBlockInput;
  /** Absolute document position at the start of the node content. */
  readonly contentStart: number;
}

/** Inputs used to compile one request-local background shaping batch. */
export interface CompileQuireBackgroundShapingBatchOptions {
  /** Exact runtime capabilities required by every block in the batch. */
  readonly capabilities: QuireBackgroundShapingCapabilitySnapshot;
  /** Main-thread node attachments and clone-safe block inputs. */
  readonly attachments: readonly QuireBackgroundShapingAttachmentInput[];
}

/** Diagnostics returned after accepted output is attached to the shape cache. */
export interface QuireBackgroundShapingAttachmentDiagnostics {
  /** Number of validated block outputs written to the cache. */
  readonly attachedBlockCount: number;
}

/** Compiled payload plus main-thread-only accepted-output attachment authority. */
export interface QuireCompiledBackgroundShapingBatch {
  /** Structured-clone payload sent through the layout job executor. */
  readonly payload: QuireBackgroundShapingJobPayload;
  /**
   * Atomically validates and attaches one accepted output to the shape cache.
   *
   * Callers must invoke this only after coordinator acceptance. The batch keeps
   * live node identities local and never serializes them into the job payload.
   *
   * @param output - Fresh unknown output accepted by the layout job coordinator.
   * @param cache - Main-thread block-shape cache receiving shaped fragments.
   * @returns Attachment diagnostics.
   */
  readonly attachAcceptedOutput: (
    output: unknown,
    cache: CanvasBlockShapeCache
  ) => QuireBackgroundShapingAttachmentDiagnostics;
}

/** Why one top-level block cannot enter the pure shaping job. */
export type QuireBackgroundShapingCompilationGapCode =
  | "empty-textblock"
  | "non-textblock"
  | "provider-owned";

/** Explicit block-local gap retained by the main-thread compiler. */
export interface QuireBackgroundShapingCompilationGap {
  /** Stable machine-readable gap code. */
  readonly code: QuireBackgroundShapingCompilationGapCode;
  /** Zero-based top-level block index. */
  readonly blockIndex: number;
  /** ProseMirror node type that could not enter pure shaping. */
  readonly nodeType: string;
  /** Human-readable diagnostic detail. */
  readonly message: string;
}

/** Inputs for compiling a top-level editor range into pure shaping work. */
export interface CompileQuireEditorBackgroundShapingOptions {
  /** Editor whose current immutable document owns the requested blocks. */
  readonly editor: QuireEditor;
  /** Inclusive first top-level block index. */
  readonly fromIndex: number;
  /** Exclusive last top-level block index. */
  readonly toIndex: number;
  /** Exact runtime capabilities required by the shaping handler. */
  readonly capabilities: QuireBackgroundShapingCapabilitySnapshot;
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
  /** Canonical inline wrapping mode. */
  readonly lineBreakMode: QuireLineBreakMode;
  /** Optional precompiled node text-style resolver. */
  readonly resolveNodeQuireTextStyle?: QuireNodeCanvasTextStyleResolver | undefined;
  /** Optional precompiled mark-style resolver. */
  readonly resolveMarkQuireStyle?: QuireMarkCanvasStyleResolver | undefined;
  /** Shape cache used to skip blocks that are already warm. */
  readonly cache: CanvasBlockShapeCache;
}

/** Compiled pure shaping work plus explicit unsupported block gaps. */
export interface QuireEditorBackgroundShapingCompilation {
  /** Request-local batch for supported uncached textblocks. */
  readonly batch: QuireCompiledBackgroundShapingBatch;
  /** Blocks that remain on canonical main-thread layout. */
  readonly gaps: readonly QuireBackgroundShapingCompilationGap[];
  /** Number of textblocks omitted because their exact shape cache already hit. */
  readonly cachedBlockCount: number;
}
