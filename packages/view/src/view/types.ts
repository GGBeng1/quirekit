import type { QuireEditor, QuireEditorState } from "@quirekit/core";
import type {
  CanvasGlyphRunPainter,
  Canvas2DRenderTarget,
  QuireDisplayList,
  QuireRect
} from "@quirekit/renderer";
import type {
  QuireClientPoint,
  QuireClientRect,
  QuireHitTestResult,
  QuireInteractionSelectionTarget,
  QuireLayoutSnapshot,
  QuireSelectionDomain,
  QuireInvalidationPlan,
  QuireSurfaceConfig,
  QuireTransientNodeLayoutPatch as QuireEngineTransientNodeLayoutPatch,
  QuireViewEngineFrame,
  QuireViewEngineFrameBuildOptions,
  QuireViewEngineFrameCacheCounters,
  QuireViewEngineMeasuredPhase,
  QuireViewEngineTraceSink
} from "@quirekit/view-engine";

/** Mounted presentation hook applied to every paint-bearing display list. */
export type QuireViewDisplayListTransform = (
  displayList: QuireDisplayList
) => QuireDisplayList;
/** Measured phase emitted while a mounted view performs diagnostic work. */
export type QuireViewMeasuredPhase = QuireViewEngineMeasuredPhase;

/** Receives one measured mounted-view phase. */
export type QuireViewTraceSink = QuireViewEngineTraceSink;

/** Options used to create a canvas view facade. */
export interface QuireViewOptions {
  /** Editor instance that provides the current document state. */
  readonly editor: QuireEditor;
  /** Device pixel ratio used by the view snapshot. */
  readonly devicePixelRatio?: number;
  /** Default semantic surface styling applied to renders from this view. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
}

/** Snapshot captured from the canvas view facade. */
export interface QuireViewSnapshot {
  /** Current editor state at the moment the snapshot is captured. */
  readonly state: QuireEditorState;
  /** Device pixel ratio associated with the view. */
  readonly devicePixelRatio: number;
}

/** One exact source-node replacement used only by a speculative layout pass. */
export type QuireTransientNodeLayoutPatch = QuireEngineTransientNodeLayoutPatch;

/** Options used to run a one-shot canvas view render pass. */
export interface QuireViewRenderOptions extends QuireViewEngineFrameBuildOptions {
  /** Optional full paint clear bounds; defaults to `viewportRect` for one-shot renders. */
  readonly paintBounds?: QuireRect | undefined;
  /** Canvas 2D-like target that receives composite or content paint commands. */
  readonly target: Canvas2DRenderTarget;
  /** Optional Canvas 2D-like target that receives transient overlay commands. */
  readonly overlayTarget?: Canvas2DRenderTarget | undefined;
  /** Optional mounted resource transform applied before backend paint. */
  readonly displayListTransform?: QuireViewDisplayListTransform | undefined;
  /** Optional painter that can take over shaped glyph-run commands. */
  readonly glyphRunPainter?: CanvasGlyphRunPainter | undefined;
}

/**
 * Options used to build canvas view render artifacts without painting them.
 *
 * Targetless: it drops the paint-only fields (`target`, `overlayTarget`,
 * `paintBounds`) from {@link QuireViewRenderOptions}, so page-stack rendering can
 * build one document-space render result and paint it across per-page surfaces
 * itself without a single reference content canvas.
 */
export type QuireViewBuildOptions = QuireViewEngineFrameBuildOptions & {
  /** Optional mounted resource transform applied before backend paint. */
  readonly displayListTransform?: QuireViewDisplayListTransform | undefined;
};

/** Cache counters sampled after one render-result build. */
export type QuireViewRenderCacheCounters = QuireViewEngineFrameCacheCounters;

/** Artifacts produced by a one-shot canvas view render pass. */
export type QuireViewRenderResult = QuireViewEngineFrame;

/** Mounted facts shared by DOM flow and paginated renderers, with optional engine diagnostics. */
export type QuireMountedRenderResult = Omit<QuireViewRenderResult,
  "displayOwnerIndex" | "displayInvalidation" | "displayOwnerDiagnostics" | "displayOwnerChunks"
> & Partial<Pick<QuireViewRenderResult,
  "displayOwnerIndex" | "displayInvalidation" | "displayOwnerDiagnostics" | "displayOwnerChunks"
>>;

/**
 * Event emitted after any mounted view backend completes a render pass.
 *
 * DOM flow reports browser geometry and DOM presentation facts. Paginated
 * backends additionally report Engine paint owners, chunks and cache counters.
 */
export interface QuireMountedViewRenderEvent<Result extends QuireMountedRenderResult = QuireMountedRenderResult> {
  /** Mounted view that produced the render pass, when available. */
  readonly view?: { readonly id: string; readonly mode: string } | undefined;
  /** Render artifacts produced by the pass. */
  readonly renderResult: Result;
  /** Render strategy selected by the runtime, when available. */
  readonly strategy?: string | undefined;
  /** Why the render ran, when the runtime reports it. */
  readonly reason?: string | undefined;
  /** Viewport rectangle used for layout and paint clearing, when available. */
  readonly viewportRect?: QuireRect | undefined;
  /** Mounted content surface dimensions in CSS pixels, when available. */
  readonly displaySize?: { readonly width: number; readonly height: number } | undefined;
  /** Device pixel ratio used by the mounted render pass, when available. */
  readonly devicePixelRatio?: number | undefined;
  /** Measured render phases produced during this mounted render pass. */
  readonly phases?: readonly QuireViewMeasuredPhase[] | undefined;
}

/** Options used to run a selection-driven invalidated render update. */
export interface QuireViewSelectionUpdateOptions extends QuireViewRenderOptions {
  /** Previous render result used to compare selection geometry. */
  readonly previousRenderResult: QuireViewRenderResult;
}

/** Artifacts produced by a selection-driven invalidated render update. */
export interface QuireViewSelectionUpdateResult extends QuireViewRenderResult {
  /** Invalidation plan computed for diagnostics and future optimized repainting. */
  readonly invalidationPlan: QuireInvalidationPlan;
}

/** Options used to apply a pointer hit-test result to the editor selection. */
export interface QuireViewPointerSelectionOptions {
  /** Retained interaction geometry snapshot produced by the latest render pass. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Browser client point to map into canvas coordinates. */
  readonly clientPoint: QuireClientPoint;
  /** Canvas client rectangle used as the coordinate conversion origin. */
  readonly canvasClientRect: QuireClientRect;
  /** Document-space bounds the canvas client rectangle maps onto, when known. */
  readonly surfaceBounds?: QuireRect | undefined;
}

/** Result produced when applying a pointer position to editor selection. */
export interface QuireViewPointerSelectionResult {
  /** Geometry snapshot used for pointer hit testing. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Hit-test result produced from the pointer coordinates. */
  readonly hitTestResult: QuireHitTestResult;
  /** Interaction selection target resolved from the pointer hit. */
  readonly interactionTarget: QuireInteractionSelectionTarget | null;
  /** Whether the hit-test result produced an editor state update. */
  readonly updated: boolean;
  /** Selection domain that interpreted the hit, when a selection was produced. */
  readonly selectionDomain?: QuireSelectionDomain | undefined;
}

/** Result produced when hit-testing a pointer without changing selection. */
export interface QuireViewPointerHitTestResult {
  /** Geometry snapshot used for pointer hit testing. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Hit-test result produced from the pointer coordinates. */
  readonly hitTestResult: QuireHitTestResult;
  /** Interaction selection target resolved from the pointer hit. */
  readonly interactionTarget: QuireInteractionSelectionTarget | null;
}

/** Result produced when applying a pointer drag range to editor selection. */
export interface QuireViewPointerRangeSelectionResult {
  /** Geometry snapshot used for pointer hit testing. */
  readonly geometrySnapshot: QuireLayoutSnapshot;
  /** Hit-test result produced from the anchor pointer coordinates. */
  readonly anchorHitTestResult: QuireHitTestResult;
  /** Hit-test result produced from the head pointer coordinates. */
  readonly headHitTestResult: QuireHitTestResult;
  /** Whether the hit-test results produced an editor state update. */
  readonly updated: boolean;
  /** Selection domain that interpreted the range, when a selection was produced. */
  readonly selectionDomain?: QuireSelectionDomain | undefined;
}
