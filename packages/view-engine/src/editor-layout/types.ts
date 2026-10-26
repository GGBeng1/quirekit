import type { QuireEditor, QuireEditorState } from "@quirekit/core";
import type { QuireResolvedDocumentProfile } from "../document-profile/types";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireViewUpdatePatch, QuireLayoutDirtyRange } from "../invalidation";
import type {
  CanvasBlockShapeCache,
  CanvasMeasuredSourceCache
} from "../layout/cache";
import type {
  QuirePageGeometry,
  QuireRetainedPaginationCheckpointStore
} from "@quirekit/layout/pagination";
import type {
  QuireLayoutTraceSink,
  QuireLineBreakerPolicy,
  QuireLineBreakMode
} from "@quirekit/layout/inline";
import type {
  QuireLayoutProductSnapshot,
  QuireLayoutDomOverlay,
  QuireLayoutSnapshotViewGraphOptions,
  QuireRetainedLayoutProductSnapshot
} from "../layout/types";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireLayoutDocument } from "../layout/engine/types";
import type { QuireSelectionStructureIntervalIndex } from "../interaction/selection/structure";

/** Options used to adapt engine layout into the mounted snapshot contract. */
export interface QuireLayoutSnapshotAdapterOptions {
  /** Editor state used to produce the layout document. */
  readonly state: QuireLayoutSnapshot["state"];
  /** Engine layout document to adapt. */
  readonly document: QuireLayoutDocument;
  /** Viewport rectangle associated with the layout pass. */
  readonly viewportRect: QuireLayoutSnapshot["viewportRect"];
  /** DOM overlays already resolved by the layout pass. */
  readonly domOverlays?: readonly QuireLayoutDomOverlay[];
  /**
   * Optional document-space rectangles limiting the adapted snapshot tree.
   *
   * The engine document and page metadata stay complete; this only omits layout
   * nodes and retained hit targets outside the active viewport window before
   * mounted render consumers traverse the snapshot.
   */
  readonly snapshotClipRects?: readonly QuireRect[] | undefined;
  /** Preallocated retained authority shared with provider execution. */
  readonly viewGraphOptions?: QuireLayoutSnapshotViewGraphOptions | undefined;
  /** Compiled adapter-owned source intervals for structured range planning. */
  readonly selectionStructureIndex?: QuireSelectionStructureIntervalIndex | undefined;
  /** Document semantics used to lay out the document. */
  readonly documentProfile?: QuireResolvedDocumentProfile | undefined;
}

/** First-line collision behavior used when a list prefix exceeds its hanging interval. */
export type QuireListMarkerCollisionPolicy = "compact" | "word-compatible";

/** View policy applied to direct Word-compatible hidden text. */
export type QuireHiddenTextViewMode = "normal" | "formatting-inspection";

/** Inputs used by the editor adapter to compile one retained layout snapshot. */
export interface QuireLayoutSnapshotOptions {
  /** Editor state whose document should be laid out. */
  readonly state: QuireEditorState;
  /** Editor that owns this layout pass when the snapshot is built for a mounted view. */
  readonly editor?: QuireEditor | undefined;
  /** Viewport rectangle that anchors the layout snapshot. */
  readonly viewportRect: QuireRect;
  /** Optional page geometry used to derive page metadata during layout. */
  readonly pageGeometry?: QuirePageGeometry | undefined;
  /** Minimum paragraph lines kept together at a page top (widows). Defaults to off (1). */
  readonly widows?: number | undefined;
  /** Minimum paragraph lines kept together at a page bottom (orphans). Defaults to off (1). */
  readonly orphans?: number | undefined;
  /** Optional measurer used to build text fragment caret stops. */
  readonly textMeasurer?: QuireTextMeasurer | undefined;
  /** Optional CSS font shorthand used to measure text fragments. */
  readonly font?: string | undefined;
  /** Optional vertical offset from node top edge to text baseline. */
  readonly textBaselineOffset?: number | undefined;
  /** Optional inline line-breaking strategy. */
  readonly lineBreakMode?: QuireLineBreakMode | undefined;
  /** Optional segment policy used to classify inline line-break opportunities. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Hidden-text presentation policy. Defaults to `normal`. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** List-prefix collision policy. Defaults to QuireKit's compact measured clearance. */
  readonly listMarkerCollision?: QuireListMarkerCollisionPolicy | undefined;
  /** Per-block text-shaping cache owned by the mounted editor view. */
  readonly blockShapeCache?: CanvasBlockShapeCache | undefined;
  /** Measured-source cache owned by the mounted editor view. */
  readonly measuredSourceCache?: CanvasMeasuredSourceCache | undefined;
  /** Pagination checkpoint store owned by the mounted editor view. */
  readonly paginationCheckpointStore?: QuireRetainedPaginationCheckpointStore | undefined;
  /**
   * Exact top-level shape prefix; later blocks retain estimated geometry while
   * nested children and the active selection head still receive exact shaping.
   * Omit for full-document shaping.
   */
  readonly maxBlocks?: number | undefined;
  /**
   * Cumulative top-level shape extent; later blocks are estimated even before
   * maxBlocks is reached. The active selection head remains an exact exception.
   */
  readonly maxShapedBlockExtent?: number | undefined;
  /** Document-space rectangles limiting mounted snapshot products. */
  readonly snapshotClipRects?: readonly QuireRect[] | undefined;
  /** Dirty range derived from the editor transactions that triggered this pass. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Current typed update evidence required for canonical layout reuse. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
  /** Whether the frame uses speculative state, including a currently empty preview. */
  readonly transientPreview?: boolean | undefined;
  /** Sink receiving editor-layout compilation stage timings. */
  readonly trace?: QuireLayoutTraceSink | undefined;
}

/** Layout product attached to the editor state that produced it. */
export interface QuireLayoutSnapshot extends QuireLayoutProductSnapshot {
  /** Editor state used to compile this snapshot. */
  readonly state: QuireEditorState;
  /** Document semantics the snapshot was laid out with, for paint-time queries. */
  readonly documentProfile?: QuireResolvedDocumentProfile | undefined;
}

/** Stateful snapshot fields collected before retained graph validation completes. */
export type QuireLayoutSnapshotDraft = Omit<QuireLayoutSnapshot, "viewGraph">;

/** Stateful production snapshot carrying its mandatory retained view graph. */
export interface QuireRetainedLayoutSnapshot
  extends QuireRetainedLayoutProductSnapshot {
  /** Editor state used to compile this snapshot. */
  readonly state: QuireEditorState;
  /** Document semantics the snapshot was laid out with, for paint-time queries. */
  readonly documentProfile?: QuireResolvedDocumentProfile | undefined;
}
