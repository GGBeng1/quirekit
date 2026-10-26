import type {
  MountedViewUpdateScheduleMode,
  MountedViewUpdateSchedulerCounters,
  MountedDrawingCreationOptions,
  MountedPaginatedViewRenderReason,
  QuireMountedCaretRenderingMode,
  QuireMountedEditorView,
  QuireMountedEditorViewElements,
  QuireMountedEditorViewOptions,
  QuireMountedEditorViewUpdateOptions,
  QuireMountedViewportPadding,
  QuireViewAdapter
} from "../shared";
import type {
  QuireDisplayListStyles,
  QuireHiddenTextViewMode,
  QuireSurfaceConfig
} from "@quirekit/view-engine";
import type { QuireRect } from "@quirekit/renderer";
import type { QuireHitTestResult } from "@quirekit/view-engine";
import type { QuireListMarkerCollisionPolicy } from "@quirekit/view-engine";
import type { QuireTextMeasurer } from "@quirekit/layout/text";
import type { QuireMediaAssetResolver } from "@quirekit/media";
import type { QuireImageResourceDecoder } from "../shared";
import type { QuireLineBreakerPolicy } from "@quirekit/layout/inline";
import type { QuirePageGeometry } from "@quirekit/layout/pagination";
import type { QuireMountedViewRenderEvent } from "../types";

/** DOM elements owned by a mounted SVG editor view. */
export interface SvgMountedViewElements extends QuireMountedEditorViewElements {
  /** Root element owned by this mounted SVG view. */
  readonly root: HTMLElement;
  /** DOM host for node views and positioned overlays above the SVG surface. */
  readonly overlayHost: HTMLElement;
  /** Text input proxy used by keyboard, IME, and clipboard events. */
  readonly inputProxy: HTMLTextAreaElement;
  /** Invisible document-bounds surface used as the coordinate driver. */
  readonly documentSurface: HTMLElement;
  /** Page-stack host that owns per-page SVG frames. */
  readonly pageStackHost: HTMLElement;
}

/** Event emitted after pointer hit testing in a mounted SVG view. */
export interface SvgMountedViewPointerHitTestEvent {
  /** Mounted view that processed the pointer event. */
  readonly view: SvgMountedView;
  /** Hit-test result produced from the latest layout snapshot. */
  readonly hitTestResult: QuireHitTestResult;
}

/** Scheduler phase emitted by a mounted SVG view. */
export type SvgMountedViewUpdateSchedulePhase = "request" | "render";

/** Render reason accepted by the mounted SVG scheduler diagnostics. */
export type SvgMountedViewRenderReason = MountedPaginatedViewRenderReason;

/** Event emitted when a mounted SVG view schedules or executes an update. */
export interface SvgMountedViewUpdateScheduleEvent {
  /** Mounted view that produced the scheduler event. */
  readonly view: SvgMountedView;
  /** Scheduler phase that just occurred. */
  readonly phase: SvgMountedViewUpdateSchedulePhase;
  /** Mounted update reason being scheduled or rendered. */
  readonly reason: SvgMountedViewRenderReason;
  /** Whether the update ran synchronously or through the frame queue. */
  readonly mode: MountedViewUpdateScheduleMode;
  /** Scheduler counters after the phase. */
  readonly counters: MountedViewUpdateSchedulerCounters;
}

/** Runtime options specific to a mounted SVG editor view. */
export interface SvgMountedViewRuntimeOptions {
  /** Preferred CSS pixel width for the mounted SVG surface. */
  readonly width?: number | undefined;
  /** Preferred CSS pixel height for the mounted SVG surface. */
  readonly height?: number | undefined;
  /** Optional viewport rectangle used when rendering mounted SVG content. */
  readonly viewportRect?: QuireRect | undefined;
  /** Insets used to derive the viewport from the current SVG display size. */
  readonly viewportPadding?: QuireMountedViewportPadding | undefined;
  /** Optional page geometry used by mounted layout pagination. */
  readonly pageGeometry?: QuirePageGeometry | undefined;
  /** Minimum paragraph lines kept together at a page top (widows). Defaults to off (1). */
  readonly widows?: number | undefined;
  /** Minimum paragraph lines kept together at a page bottom (orphans). Defaults to off (1). */
  readonly orphans?: number | undefined;
  /** Optional display-list style overrides applied to mounted SVG renders. */
  readonly displayListStyles?: Partial<QuireDisplayListStyles> | undefined;
  /** Optional semantic surface styling for selection and IME affordances. */
  readonly surfaceConfig?: QuireSurfaceConfig | undefined;
  /** Explicit portable media resolver used by mounted image resources. */
  readonly mediaResolver?: QuireMediaAssetResolver | undefined;
  /** Optional browser image decoder override, primarily for host integration and tests. */
  readonly imageDecoder?: QuireImageResourceDecoder | undefined;
  /** Optional text measurer used by mounted layout geometry. */
  readonly textMeasurer?: QuireTextMeasurer | undefined;
  /**
   * Text measurement backend used by mounted SVG layout. Defaults to `shared`,
   * which uses `textMeasurer` or the shared layout default. `browser` wraps the
   * fallback measurer with hidden SVG text width reads so wrapping can track the
   * browser's rendered SVG metrics without changing pagination ownership.
   */
  readonly textMeasurementBackend?: "shared" | "browser" | undefined;
  /** Optional segment policy used to classify inline line-break opportunities. */
  readonly lineBreaker?: QuireLineBreakerPolicy | undefined;
  /** Initial hidden-text presentation policy. Defaults to `normal`. */
  readonly hiddenTextViewMode?: QuireHiddenTextViewMode | undefined;
  /** List-prefix collision policy. Defaults to compact measured clearance. */
  readonly listMarkerCollision?: QuireListMarkerCollisionPolicy | undefined;
  /** Whether to report diagnostic browser-native width reads for visible SVG text. */
  readonly browserMeasureProbe?: boolean | undefined;
  /**
   * Observes which page-stack frames are currently mounted.
   *
   * @param indices - Ascending page indices currently kept mounted.
   */
  readonly onVisiblePagesChange?: ((indices: readonly number[]) => void) | undefined;
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
   * {@link SvgMountedViewRuntimeOptions.cancelUpdateFrame} with this hook.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Opaque frame handle for cancellation.
   */
  readonly requestUpdateFrame?: ((callback: () => void) => number) | undefined;
  /**
   * Cancels a frame scheduled by
   * {@link SvgMountedViewRuntimeOptions.requestUpdateFrame}.
   *
   * @param handle - Opaque frame handle returned by `requestUpdateFrame`.
   */
  readonly cancelUpdateFrame?: ((handle: number) => void) | undefined;
  /**
   * Observes this view's render passes, e.g. to size the surface from the
   * rendered document height instead of rebuilding a layout snapshot.
   *
   * @param event - Render event produced by this mounted view.
   */
  readonly onRender?: ((event: QuireMountedViewRenderEvent) => void) | undefined;
  /**
   * Observes mounted update scheduling for diagnostics and performance harnesses.
   *
   * @param event - Scheduler event produced by this mounted view.
   */
  readonly onUpdateSchedule?:
    | ((event: SvgMountedViewUpdateScheduleEvent) => void)
    | undefined;
  /**
   * Observes pointer hit-test results for diagnostics.
   *
   * @param event - Pointer hit-test event produced by this mounted view.
   */
  readonly onPointerHitTest?:
    | ((event: SvgMountedViewPointerHitTestEvent) => void)
    | undefined;
  /**
   * Observes focus changes for diagnostics or outer UI state.
   *
   * @param focused - Whether this mounted view input proxy is focused.
   */
  readonly onFocusChange?: ((focused: boolean) => void) | undefined;
}

/** Options used to create a mounted SVG editor view. */
export interface SvgMountedViewOptions
  extends Omit<QuireMountedEditorViewOptions, "mode"> {
  /** Runtime sizing options for the SVG surfaces. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
}

/** Mounted SVG editor view lifecycle contract. */
export interface SvgMountedView extends QuireMountedEditorView {
  /** View backend mode implemented by this mounted view. */
  readonly mode: "svg";
  /** Elements created or claimed by this mounted SVG view. */
  readonly elements: SvgMountedViewElements;
  /**
   * Renders the latest shared editor state into this mounted SVG view.
   *
   * @param options - Shared editor state and update reason.
   */
  update(options: QuireMountedEditorViewUpdateOptions): void;
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

/** Options used to create an SVG view adapter. */
export interface SvgViewAdapterOptions {
  /** Runtime sizing options applied when the adapter mounts an SVG view. */
  readonly runtime?: SvgMountedViewRuntimeOptions | undefined;
}

/** View adapter contract for the SVG editor runtime. */
export interface SvgViewAdapter extends QuireViewAdapter {
  /** View mode handled by this adapter. */
  readonly mode: "svg";
  /**
   * Mounts an SVG editor view.
   *
   * @param options - Editor state, mount element, identity, and runtime status.
   * @returns Mounted SVG editor view.
   */
  mount(options: QuireMountedEditorViewOptions): SvgMountedView;
}
