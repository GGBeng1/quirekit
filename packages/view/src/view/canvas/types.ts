import type {
  QuireMountedEditorView,
  QuireMountedEditorViewOptions,
  QuireMountedEditorViewUpdateOptions,
  QuireMountedEditorViewElements,
  MountedPaginatedViewRenderReason,
  QuireMountedViewportPadding,
  MountedDrawingCreationOptions,
  QuireViewAdapter
} from "../shared";
import type { QuireLayoutWorkerHost } from "../shared";
import type {
  QuireViewRenderOptions,
  QuireViewRenderResult,
  QuireViewMeasuredPhase,
  QuireViewSelectionUpdateOptions,
  QuireViewSelectionUpdateResult
} from "../types";
import type {
  QuireDisplayListStyles,
  QuireHiddenTextViewMode,
  QuireSurfaceConfig
} from "@quirekit/view-engine";
import type { CanvasGlyphRunPainter, QuireRect } from "@quirekit/renderer";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type { QuireListMarkerCollisionPolicy } from "@quirekit/view-engine";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireMediaAssetResolver } from "@quirekit/media";
import type { QuireImageResourceDecoder } from "../shared";
import type {
  QuireLineBreakMode,
  QuireLineBreakerPolicy,
} from "@quirekit/layout/inline";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type {
  MountedViewUpdateScheduleMode,
  MountedViewUpdateSchedulerCounters,
  QuireMountedCaretMode,
  QuireMountedCaretRenderingMode
} from "../shared";

/** Reason accepted by the Canvas 2D render scheduler. */
export type CanvasViewRenderScheduleReason = MountedPaginatedViewRenderReason;

/** Paint strategy selected for a scheduled Canvas 2D render pass. */
export type CanvasViewRenderStrategy =
  | "full"
  | "selection-update";

/** Minimal QuireView rendering surface required by the scheduler. */
export interface CanvasViewRenderExecutor {
  /**
   * Runs a full Canvas 2D render pass.
   *
   * @param options - Viewport, target, and style inputs for rendering.
   * @returns Full render artifacts for the current editor state.
   */
  render(options: QuireViewRenderOptions): QuireViewRenderResult;
  /**
   * Runs a selection-driven render update.
   *
   * @param options - Previous render result, viewport, target, and style inputs.
   * @returns Updated render artifacts with selection invalidation diagnostics.
   */
  renderSelectionUpdate(
    options: QuireViewSelectionUpdateOptions
  ): QuireViewSelectionUpdateResult;
}

/** Inputs used to choose a Canvas 2D render strategy. */
export interface CanvasViewRenderStrategyOptions {
  /** Why the render pass was requested. */
  readonly reason: CanvasViewRenderScheduleReason;
  /** Previous render artifacts available for incremental selection updates. */
  readonly previousRenderResult?: QuireViewRenderResult | undefined;
}

/** Inputs used to run a scheduled Canvas 2D render pass. */
export interface CanvasViewRenderScheduleOptions
  extends CanvasViewRenderStrategyOptions {
  /** Canvas renderer that executes the selected strategy. */
  readonly view: CanvasViewRenderExecutor;
  /** Options forwarded to the selected render method. */
  readonly renderOptions: QuireViewRenderOptions;
}

/** Result returned after a scheduled Canvas 2D render pass. */
export interface CanvasViewScheduledRenderResult {
  /** Strategy selected for this render pass. */
  readonly strategy: CanvasViewRenderStrategy;
  /** Render artifacts produced by the selected strategy. */
  readonly renderResult: QuireViewRenderResult;
  /** Selection update artifacts when the selected strategy was selection-driven. */
  readonly selectionUpdateResult?: QuireViewSelectionUpdateResult | undefined;
  /** Measured render phases produced during this render pass. */
  readonly phases?: readonly QuireViewMeasuredPhase[] | undefined;
}

/** CSS-sized dimensions for a mounted Canvas 2D surface. */
export interface CanvasSurfaceSize {
  /** Surface width in CSS pixels. */
  readonly width: number;
  /** Surface height in CSS pixels. */
  readonly height: number;
}

/** Rectangle shape read from a browser canvas client rect. */
export interface CanvasSurfaceDisplayRect {
  /** Displayed canvas width in CSS pixels. */
  readonly width: number;
  /** Displayed canvas height in CSS pixels. */
  readonly height: number;
}

/** Options used to resolve a Canvas 2D surface display size. */
export interface CanvasSurfaceDisplaySizeOptions {
  /** Current displayed canvas rectangle after CSS layout. */
  readonly rect: CanvasSurfaceDisplayRect;
  /** Fallback size used before CSS layout has produced positive dimensions. */
  readonly fallback: CanvasSurfaceSize;
}

/** Options used to resolve a Canvas 2D surface backing size. */
export interface CanvasSurfaceBackingSizeOptions {
  /** Display size in CSS pixels. */
  readonly displaySize: CanvasSurfaceSize;
  /** Device pixel ratio used for backing dimensions. */
  readonly devicePixelRatio: number;
}

/** DOM elements owned by a mounted Canvas 2D editor view. */
export interface CanvasMountedViewElements extends QuireMountedEditorViewElements {
  /** Root element owned by this mounted canvas view. */
  readonly root: HTMLElement;
  /**
   * Pointer target and document-space coordinate origin for this view. Pointer
   * events bind to it and its client rect anchors `posAtCoords`/`coordsAtPos`. In
   * single-surface mode this is the content canvas; in page-stack mode it is a
   * lightweight pointer/coordinate layer beneath the per-page frames.
   */
  readonly coordinateSurface: HTMLElement;
  /**
   * Canvas surface that paints persistent document content. Present only in
   * single-surface mode; page-stack mode paints per-page frames instead.
   */
  readonly contentSurface?: HTMLCanvasElement | undefined;
  /**
   * Canvas surface that paints transient selection and decoration overlays.
   * Present only in single-surface mode.
   */
  readonly overlaySurface?: HTMLCanvasElement | undefined;
  /** DOM host for node views and positioned overlays above the canvas. */
  readonly overlayHost: HTMLElement;
  /** Text input proxy used by keyboard, IME, and clipboard events. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Page-stack host that owns per-page surfaces when page-stack mode is on. */
  readonly pageStackHost?: HTMLElement | undefined;
}

/** Cumulative diagnostics for retained Canvas page content artifacts. */
export interface CanvasPageContentCacheDiagnostics {
  /** Unchanged live surfaces that required no synchronization. */
  readonly liveSurfaceSkips: number;
  /** Page content surfaces restored from retained bitmap artifacts. */
  readonly bitmapRestores: number;
  /** Page content surfaces painted by replaying their display lists. */
  readonly displayListPaints: number;
  /** New bitmap artifacts stored after successful display-list paints. */
  readonly bitmapStores: number;
  /** Existing bitmap artifacts replaced under the same content version. */
  readonly bitmapReplacements: number;
  /** Least-recently-used bitmap artifacts removed to satisfy the budget. */
  readonly bitmapEvictions: number;
  /** Oversized bitmap artifacts rejected because one entry exceeded the budget. */
  readonly oversizedBitmapSkips: number;
  /** Number of bitmap artifacts currently retained. */
  readonly retainedBitmapEntries: number;
  /** Estimated backing-store bytes currently retained. */
  readonly retainedBitmapBytes: number;
  /** Configured maximum retained bitmap bytes. */
  readonly maxBitmapBytes: number;
}

/** Event emitted after a mounted canvas view render pass. */
export interface CanvasMountedViewRenderEvent {
  /** Mounted view that produced the render pass. */
  readonly view: CanvasMountedView;
  /** Render artifacts produced by the pass. */
  readonly renderResult: QuireViewRenderResult;
  /** Strategy selected by the render scheduler. */
  readonly strategy: CanvasViewRenderStrategy;
  /**
   * Why the render ran (e.g. `initial`, `scroll`, `transaction`, `fill`) — more
   * descriptive than the binary strategy, used to label diagnostics entries.
   */
  readonly reason?: string | undefined;
  /** Viewport rectangle used for layout and paint clearing. */
  readonly viewportRect: QuireRect;
  /** Display size of the mounted content surface in CSS pixels. */
  readonly displaySize: CanvasSurfaceSize;
  /** Device pixel ratio used for canvas backing stores. */
  readonly devicePixelRatio: number;
  /** Measured render phases produced during this mounted render pass. */
  readonly phases?: readonly QuireViewMeasuredPhase[] | undefined;
  /** Retained page content cache diagnostics in Canvas page-stack mode. */
  readonly pageContentCache?: CanvasPageContentCacheDiagnostics | undefined;
}

/** Phase emitted by the mounted Canvas update scheduler diagnostics hook. */
export type CanvasMountedViewUpdateSchedulePhase = "request" | "render";

/** Event emitted when the mounted Canvas update scheduler changes state. */
export interface CanvasMountedViewUpdateScheduleEvent {
  /** Mounted view whose update scheduler emitted the event. */
  readonly view: CanvasMountedView;
  /** Scheduler phase that produced this event. */
  readonly phase: CanvasMountedViewUpdateSchedulePhase;
  /** Why the scheduled mounted render was requested. */
  readonly reason: CanvasViewRenderScheduleReason;
  /** Whether this update was synchronous or frame-coalesced. */
  readonly mode: MountedViewUpdateScheduleMode;
  /** Stable scheduler counters after the phase completed. */
  readonly counters: MountedViewUpdateSchedulerCounters;
}

/** Event emitted after pointer hit testing in a mounted canvas view. */
export interface CanvasMountedViewPointerHitTestEvent {
  /** Mounted view that processed the pointer event. */
  readonly view: CanvasMountedView;
  /** Hit-test result produced from the latest layout snapshot. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Runtime options specific to a mounted Canvas 2D editor view. */
export interface CanvasMountedViewRuntimeOptions {
  /** Preferred CSS pixel width for the mounted content surface. */
  readonly width?: number | undefined;
  /** Preferred CSS pixel height for the mounted content surface. */
  readonly height?: number | undefined;
  /** Device pixel ratio used for canvas backing-store sizing. Defaults to 2. */
  readonly devicePixelRatio?: number | undefined;
  /** Reads the current device pixel ratio, clamped to the default 2x minimum. */
  readonly getDevicePixelRatio?: (() => number) | undefined;
  /** Optional viewport rectangle used when rendering mounted canvas content. */
  readonly viewportRect?: QuireRect | undefined;
  /** Insets used to derive the viewport from the current canvas display size. */
  readonly viewportPadding?: QuireMountedViewportPadding | undefined;
  /** Optional page geometry used by mounted layout pagination. */
  readonly pageGeometry?: QuirePageGeometry | undefined;
  /** Minimum paragraph lines kept together at a page top (widows). Defaults to off (1). */
  readonly widows?: number | undefined;
  /** Minimum paragraph lines kept together at a page bottom (orphans). Defaults to off (1). */
  readonly orphans?: number | undefined;
  /** Optional display-list style overrides applied to mounted render passes. */
  readonly displayListStyles?: Partial<QuireDisplayListStyles> | undefined;
  /** Optional semantic surface styling for selection and IME affordances. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Explicit portable media resolver used by mounted image resources. */
  readonly mediaResolver?: QuireMediaAssetResolver | undefined;
  /** Optional browser image decoder override, primarily for host integration and tests. */
  readonly imageDecoder?: QuireImageResourceDecoder | undefined;
  /** Optional text measurer used by mounted layout geometry. */
  readonly textMeasurer?: QuireTextMeasurer | undefined;
  /** Optional segment policy used to classify inline line-break opportunities. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Initial hidden-text presentation policy. Defaults to `normal`. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** List-prefix collision policy. Defaults to compact measured clearance. */
  readonly listMarkerCollision?: QuireListMarkerCollisionPolicy | undefined;
  /**
   * Optional host capability for clone-safe layout acceleration.
   *
   * The host creates the published module Worker through its own bundler. The
   * runtime currently routes only remainder pagination through this capability;
   * live font measurement and background shaping remain on the main thread.
   */
  readonly layoutWorkerHost?: QuireLayoutWorkerHost | undefined;
  /**
   * Optional painter that can take over shaped glyph-run commands.
   *
   * Omit this to use stable native Canvas `fillText` for glyph runs. Provide a
   * cluster or path painter only when the host intentionally opts into
   * shaped-position text diagnostics or has complete font outline coverage.
   */
  readonly glyphRunPainter?: CanvasGlyphRunPainter | undefined;
  /**
   * Initial caret presentation mode. Defaults to `blink`, which blinks while the
   * view is focused and editable and hides in read-only/preview views. Use the
   * mounted view `setCaretMode` method to change it at runtime.
   */
  readonly caret?: QuireMountedCaretMode | undefined;
  /**
   * Caret rendering backend. Defaults to `dom`: a CSS-animated DOM caret element
   * positioned through the coordinate authority, with no caret in the overlay
   * display list. Set to `overlay` to fall back to the overlay-painted caret.
   */
  readonly caretRendering?: QuireMountedCaretRenderingMode | undefined;
  /**
   * Optional frame scheduler used for mounted update coalescing. Hosts usually
   * leave this unset so the runtime uses `requestAnimationFrame`; tests can inject
   * a deterministic scheduler. Provide
   * {@link CanvasMountedViewRuntimeOptions.cancelUpdateFrame} with this hook.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Opaque frame handle for cancellation.
   */
  readonly requestUpdateFrame?: ((callback: () => void) => number) | undefined;
  /**
   * Cancels a frame scheduled by
   * {@link CanvasMountedViewRuntimeOptions.requestUpdateFrame}.
   *
   * @param handle - Opaque frame handle returned by `requestUpdateFrame`.
   */
  readonly cancelUpdateFrame?: ((handle: number) => void) | undefined;
  /**
   * Renders each page to its own positioned content/overlay canvas instead of one
   * surface. Document coordinates are preserved, so the gaps between pages carry no
   * canvas and reveal the chrome. See
   * `docs/implementation/canvas-page-stack-surface.md`.
   */
  readonly pageStack?: boolean | undefined;
  /**
   * Scroll model used to resolve the visible document region in page-stack mode.
   * `"viewport"` (the default) uses an editor-owned inner `overflow: auto`
   * viewport supplied via {@link CanvasMountedViewRuntimeOptions.scrollViewport};
   * `"ancestor"` observes a designated ancestor scroller (or the window). When the
   * viewport model is selected without a `scrollViewport`, the mount falls back to
   * the ancestor model so external embedder scrolling keeps working.
   */
  readonly scrollSource?: "viewport" | "ancestor" | undefined;
  /**
   * Editor-owned `overflow: auto` viewport for the `"viewport"` scroll model. When
   * omitted, the mount uses the ancestor scroll model.
   */
  readonly scrollViewport?: HTMLElement | undefined;
  /**
   * Explicit ancestor scroller for the `"ancestor"` scroll model. When omitted,
   * the nearest scrollable ancestor of the view root (or the window) is used.
   */
  readonly scroller?: HTMLElement | Window | undefined;
  /**
   * Extra pages kept mounted above and below the on-screen pages, smoothing
   * scrolling by realizing neighbours before they enter the viewport. Defaults to
   * 1 (the visible pages plus one page each side).
   */
  readonly scrollBufferPages?: number | undefined;
  /**
   * Observes changes to the visible page set as the document scrolls. The visible
   * set drives page-stack virtualization (only these pages have mounted frames),
   * so this hook reports exactly which pages are realized for the current scroll
   * position.
   *
   * @param indices - Ascending page indices currently mounted.
   */
  readonly onVisiblePagesChange?: ((indices: readonly number[]) => void) | undefined;
  /**
   * Observes mounted render passes for diagnostics or peer previews.
   *
   * @param event - Render event produced by this mounted view.
   */
  readonly onRender?: ((event: CanvasMountedViewRenderEvent) => void) | undefined;
  /**
   * Observes mounted update scheduling for diagnostics and performance harnesses.
   *
   * @param event - Scheduler event produced by this mounted view.
   */
  readonly onUpdateSchedule?:
    | ((event: CanvasMountedViewUpdateScheduleEvent) => void)
    | undefined;
  /**
   * Observes pointer hit-test results for diagnostics.
   *
   * @param event - Pointer hit-test event produced by this mounted view.
   */
  readonly onPointerHitTest?:
    | ((event: CanvasMountedViewPointerHitTestEvent) => void)
    | undefined;
  /**
   * Observes focus changes for diagnostics or outer UI state.
   *
   * @param focused - Whether this mounted view input proxy is focused.
   */
  readonly onFocusChange?: ((focused: boolean) => void) | undefined;
}

/** Canonical text-layout configuration shared by mounted and accelerator paths. */
export interface CanvasMountedTextLayoutConfig {
  /** Resolved base CSS font shorthand. */
  readonly font: string;
  /** Resolved default line height. */
  readonly lineHeight: number;
  /** Resolved baseline offset from the line top. */
  readonly textBaselineOffset: number;
  /** Resolved built-in line-break mode. */
  readonly lineBreakMode: QuireLineBreakMode;
}

/** Options used to create a mounted Canvas 2D editor view. */
export interface CanvasMountedViewOptions
  extends Omit<QuireMountedEditorViewOptions, "mode"> {
  /** Runtime sizing options for the Canvas 2D surfaces. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}

/** Mounted Canvas 2D editor view lifecycle contract. */
export interface CanvasMountedView extends QuireMountedEditorView {
  /** View backend mode implemented by this mounted view. */
  readonly mode: "canvas";
  /** Elements created or claimed by this mounted canvas view. */
  readonly elements: CanvasMountedViewElements;
  /** Active caret presentation mode. */
  readonly caretMode: QuireMountedCaretMode;
  /**
   * Renders the latest shared editor state into this mounted canvas view.
   *
   * @param options - Shared editor state and update reason.
   */
  update(options: QuireMountedEditorViewUpdateOptions): void;
  /**
   * Sets the caret presentation mode at runtime.
   *
   * @param mode - Caret mode to apply (`blink`, `steady`, or `hidden`).
   */
  setCaretMode(mode: QuireMountedCaretMode): void;
  /**
   * Arms one one-shot drawing creation gesture.
   *
   * @param options - Drawing family, default extent, and optional identities.
   * @returns Whether creation was armed.
   */
  armDrawingCreation(options?: MountedDrawingCreationOptions): boolean;
  /** Transfers the exact selected drawing into its independent text Story. */
  enterSelectedDrawingText(): boolean;
  /**
   * Cancels armed or captured drawing creation.
   *
   * @returns Whether active creation state was cleared.
   */
  cancelDrawingCreation(): boolean;
}

/** Options used to create a Canvas 2D view adapter. */
export interface CanvasViewAdapterOptions {
  /** Runtime sizing options applied when the adapter mounts a canvas view. */
  readonly runtime?: CanvasMountedViewRuntimeOptions | undefined;
}

/** View adapter contract for the Canvas 2D editor runtime. */
export interface CanvasViewAdapter extends QuireViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode: "canvas";
  /**
   * Mounts a Canvas 2D editor view.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted canvas editor view.
   */
  mount(options: QuireMountedEditorViewOptions): CanvasMountedView;
}
