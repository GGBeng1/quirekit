import type {
  QuireEditor,
  QuireExtensionViewEventContext,
  QuireExtensionViewEventHandlerMap,
  QuireMountedInteractionTargetSnapshot
} from "@quirekit/core";
import type { QuireRect, QuireViewHost } from "@quirekit/renderer";
import type { Transaction } from "@quirekit/pm";
import type {
  QuireActiveSelectionContext,
  QuireImePreedit,
  QuireInteractionSelectionTarget,
  QuireLayoutPage,
  QuireRetainedLayoutSnapshot,
  QuireSelectionGeometryContext
} from "@quirekit/view-engine";
import type {
  QuireClipboardOutputStrategy,
  QuireEditorInputBinding
} from "../../../input";
import type {
  MountedHeaderFooterEditingSession,
  MountedHeaderFooterPointerSelectionPreparation
} from "../header-footer-editing";
import type {
  MountedDrawingCreationOptions,
  MountedDrawingCreationPointerEvent,
  MountedDrawingPreviewState,
  MountedDrawingTextEditingSession
} from "../drawing-interaction";
import type { MountedInputBindingRenderReason } from "../input-binding";
import type { QuireEditorViewStatus } from "../types";
import type { MountedWidgetEventRuntime } from "../widget-events";
import type {
  QuirePageFrame,
  QuirePageSurfaceAdapter
} from "../page-stack";
import type {
  MountedViewUpdateRevision,
  MountedViewUpdateScheduleMode,
  MountedViewUpdateSchedulerCounters
} from "../update-scheduler";
import type { ScrollSource } from "../viewport";

/** Owns cleanup callbacks registered by one mounted view lifecycle. */
export interface MountedViewCleanupRegistry {
  /**
   * Registers one cleanup callback.
   *
   * @param cleanup - Callback that releases one mounted resource.
   */
  add(cleanup: () => void): void;
  /** Runs every registered cleanup once in reverse registration order. */
  destroy(): void;
}

/** Options used to bind mounted resize signals. */
export interface BindMountedResizeEventsOptions {
  /** Mounted root whose document owns the browser resize APIs. */
  readonly root: HTMLElement;
  /** Geometry-bearing element observed for size changes. */
  readonly observedElement: Element;
  /** Invalidates the mounted view when size inputs change. */
  readonly onResize: () => void;
}

/** Options used to create the mounted widget event lifecycle. */
export interface CreateMountedWidgetEventsOptions {
  /** Renderer-neutral host metadata for the mounted backend surface. */
  readonly host: QuireViewHost;
  /** Extension-contributed event handlers registered on the mounted scope. */
  readonly eventHandlers: QuireExtensionViewEventHandlerMap;
  /**
   * Reads the current editor and mounted-view context at dispatch time.
   *
   * @returns Context for the mounted view receiving the event.
   */
  readonly getContext: () => QuireExtensionViewEventContext;
}

/** Mounted widget runtime and its registered-handler cleanup. */
export interface MountedWidgetEventSetup {
  /** Widget event runtime attached to compiled renderer targets. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /** Cleanup for extension event handlers registered on the runtime scope. */
  readonly cleanup: () => void;
}

/** Options used to create one mounted interaction lifecycle. */
export interface CreateMountedViewInteractionLifecycleOptions {
  /** Optional backend-owned caret navigation; absent for Engine-measured surfaces. */
  readonly navigation?: import("../../../input/types").QuireEditorInputBindingOptions["navigation"];
  /** Renderer-neutral host metadata for the mounted backend surface. */
  readonly host: QuireViewHost;
  /** Extension-contributed event handlers registered on the mounted scope. */
  readonly eventHandlers: QuireExtensionViewEventHandlerMap;
  /** Reads the current editor and mounted-view context at dispatch time. */
  readonly getWidgetContext: () => QuireExtensionViewEventContext;
  /** Mounted view status that controls editability. */
  readonly status: QuireEditorViewStatus;
  /** Editor receiving transactions from mounted input. */
  readonly editor: QuireEditor;
  /** Hidden textarea input proxy owned by the mounted view. */
  readonly inputProxy: HTMLTextAreaElement;
  /**
   * Reads combined editor, mounted-status, and plugin editability.
   *
   * @returns Whether the mounted view currently accepts editing input.
   */
  readonly readEditable: () => boolean;
  /** Mounted root decorated while explicit header/footer editing is active. */
  readonly root: HTMLElement;
  /** DOM overlay host receiving transient header/footer mode chrome. */
  readonly overlayHost: HTMLElement;
  /** Reads the current retained interaction snapshot. */
  readonly getInteractionSnapshot: () => QuireRetainedLayoutSnapshot | undefined;
  /** Presents active drawing manipulation chrome without mutating editor state. */
  readonly onDrawingPreviewChange?:
    | ((state: MountedDrawingPreviewState | null) => void)
    | undefined;
  /**
   * Observes whether drawing creation owns the next or current pointer gesture.
   *
   * @param active - Whether a creation tool is armed or captured.
   */
  readonly onDrawingCreationActiveChange?:
    | ((active: boolean) => void)
    | undefined;
  /** Optional backend strategy for realizing clipboard MIME products. */
  readonly clipboardOutputStrategy?: QuireClipboardOutputStrategy | undefined;
  /**
   * Requests a mounted render after transient input changes.
   *
   * @param reason - Semantic input render reason.
   * @param imePreedit - Optional transient IME preedit.
   */
  readonly render: (
    reason: MountedInputBindingRenderReason | "mode-change",
    imePreedit?: QuireImePreedit | undefined
  ) => void;
  /**
   * Observes mounted input focus changes.
   *
   * @param focused - Whether the hidden input proxy owns focus.
   */
  readonly onFocusChange: (focused: boolean) => void;
}

/** Canonical interaction state and resource authority for one mounted view. */
export interface MountedViewInteractionLifecycle {
  /** Widget runtime attached to compiled renderer targets. */
  readonly widgetEvents: MountedWidgetEventRuntime;
  /**
   * Reads the editable input binding.
   *
   * @returns Input binding, or undefined for locked views.
   */
  getInputBinding(): QuireEditorInputBinding | undefined;
  /**
   * Selects main or auxiliary-story text after validating the exact source version.
   *
   * Header, footer, footnote, and endnote targets enter the nearest occurrence's story ownership.
   *
   * @param target - Canonical text selection, never a retained pointer approximation.
   * @param activation - Optional focus policy.
   * @returns Whether selection and input ownership were both accepted.
   */
  activateText(
    target: import("../../../mounted-services/types").QuireMountedTextTarget,
    activation?: import("../../../mounted-services/types").QuireMountedTextActivationOptions
  ): boolean;
  /**
   * Reads the active drawing-text editing session.
   *
   * @returns Active text-box session, or null outside nested drawing text.
   */
  getDrawingTextEditingSession(): MountedDrawingTextEditingSession | null;
  /**
   * Arms one one-shot drawing creation tool.
   *
   * @param options - Drawing family, default extent, and optional identities.
   * @returns Whether the primary editable view accepted the tool.
   */
  armDrawingCreation(options?: MountedDrawingCreationOptions): boolean;
  /** Transfers the exact selected drawing into its independent text Story. */
  enterSelectedDrawingText(): boolean;
  /**
   * Cancels armed or captured drawing creation.
   *
   * @returns Whether creation state was cleared.
   */
  cancelDrawingCreation(): boolean;
  /**
   * Reports whether drawing creation can consume pointer input.
   *
   * @returns Whether a tool is armed or captured.
   */
  isDrawingCreationActive(): boolean;
  /**
   * Routes one normalized pointer phase through the pure creation controller.
   *
   * @param event - Shared client/document pointer facts.
   * @returns Whether drawing creation consumed the event.
   */
  handleDrawingCreationPointer(event: MountedDrawingCreationPointerEvent): boolean;
  /** Activates pending drawing-text input once accepted retained geometry exists. */
  refreshCreatedDrawingTextEntry(): void;
  /** Reprojects selected-object contextual commands from retained geometry. */
  refreshDrawingContextualCommands(): void;
  /**
   * Reads the current explicit header/footer editing session.
   *
   * @returns Active session, or null while body input owns this view.
   */
  getHeaderFooterEditingSession(): MountedHeaderFooterEditingSession | null;
  /** Reprojects active header/footer chrome from current retained page geometry. */
  refreshHeaderFooterEditingChrome(): void;
  /**
   * Gates shared pointer selection through explicit header/footer mode rules.
   *
   * @param target - Retained pointer target produced by hit testing.
   * @param clickCount - Normalized consecutive pointer click count.
   * @returns Whether the gesture is blocked, allowed, or changes editing domain.
   */
  prepareHeaderFooterPointerSelection(
    target: QuireInteractionSelectionTarget | null,
    clickCount: number
  ): MountedHeaderFooterPointerSelectionPreparation;
  /**
   * Exits explicit header/footer editing and suspends stale story input.
   *
   * @returns Whether an active session was closed.
   */
  exitHeaderFooterEditing(): boolean;
  /** Focuses the hidden input proxy when the mounted view is editable. */
  focusInput(): void;
  /**
   * Registers a backend resource under the mounted interaction lifetime.
   *
   * @param cleanup - Callback that releases the resource.
   */
  addCleanup(cleanup: () => void): void;
  /**
   * Reads the active retained interaction target.
   *
   * @returns Active target, or null before a retained target is selected.
   */
  getInteractionTarget(): QuireInteractionSelectionTarget | null;
  /**
   * Reads clone-safe semantic facts for the current retained pointer target.
   *
   * @returns Frozen public target facts, or null without retained ownership.
   */
  getInteractionTargetSnapshot(): QuireMountedInteractionTargetSnapshot | null;
  /**
   * Replaces the active retained interaction target and its default geometry context.
   *
   * @param target - New retained interaction target.
   */
  setInteractionTarget(target: QuireInteractionSelectionTarget | null): void;
  /**
   * Reads the retained geometry context for the active selection.
   *
   * @returns Selection geometry context, when retained visual facts exist.
   */
  getSelectionGeometryContext(): QuireSelectionGeometryContext | undefined;
  /**
   * Replaces selection geometry with an explicit range or visual-instance context.
   *
   * @param context - New retained selection geometry context.
   */
  setSelectionGeometryContext(
    context: QuireSelectionGeometryContext | undefined
  ): void;
  /**
   * Resolves command-routing semantics from current editor and target state.
   *
   * @returns Active selection context, or undefined without an interaction target.
   */
  getSelectionContext(): QuireActiveSelectionContext | undefined;
  /** Releases every interaction resource once in dependency-safe order. */
  destroy(): void;
}

/** Visible-page state passed to paginated backend refresh decisions. */
export interface MountedPaginatedSurfaceViewportState {
  /** Current layout pages in document order. */
  readonly pages: readonly QuireLayoutPage[];
  /** Current page rectangles in document space. */
  readonly pageRects: readonly QuireRect[];
  /** Page indices required by the current viewport plus its configured buffer. */
  readonly visiblePageIndices: readonly number[];
}

/** Page-frame realization produced by one paginated viewport transition. */
export interface MountedPaginatedSurfaceRealization<Surface> {
  /** Every mounted page frame after the transition. */
  readonly frames: readonly QuirePageFrame<Surface>[];
  /** Frames mounted or re-geometried by this transition. */
  readonly realizedFrames: readonly QuirePageFrame<Surface>[];
  /** Page indices required by the current viewport plus its configured buffer. */
  readonly visiblePageIndices: readonly number[];
}

/** Options used to replace the canonical paginated-surface page snapshot. */
export interface ReplaceMountedPaginatedSurfacePagesOptions {
  /** New layout pages in document order. */
  readonly pages: readonly QuireLayoutPage[];
  /** Optional buffer override for this replacement, such as an initial zero-buffer paint. */
  readonly bufferPages?: number | undefined;
}

/** Options used to create one canonical paginated-surface lifecycle. */
export interface CreateMountedPaginatedSurfaceLifecycleOptions<Surface> {
  /** Scroll authority whose visible document region drives page realization. */
  readonly scrollSource: ScrollSource;
  /** Page-stack host that owns mounted backend surfaces. */
  readonly host: HTMLElement;
  /** Document used to create backend page surfaces. */
  readonly ownerDocument: Document;
  /** Backend adapter that creates, positions, attaches, and detaches page surfaces. */
  readonly adapter: QuirePageSurfaceAdapter<Surface>;
  /** Maximum detached surfaces retained for reuse. */
  readonly maxPooledFrames?: number | undefined;
  /** Maximum estimated bytes retained by detached surfaces. */
  readonly maxPooledSurfaceBytes?: number | undefined;
  /**
   * Bytes detached surfaces may keep between syncs.
   * @returns Byte budget.
   */
  readonly readRetainedPoolBytes?: (() => number) | undefined;
  /** Reads the current neighbouring-page realization buffer. */
  readonly readBufferPages: () => number;
  /** Reads the backend geometry epoch applied to page surfaces. */
  readonly readGeometryEpoch: () => number;
  /**
   * Decides whether retained clip coverage requires a document refresh.
   *
   * @param state - Current page snapshot and newly resolved visible set.
   * @returns Whether viewport realization must stop and request document refresh.
   */
  readonly shouldRequestDocumentRefresh: (
    state: MountedPaginatedSurfaceViewportState
  ) => boolean;
  /** Requests a backend document render with refreshed retained clip coverage. */
  readonly requestDocumentRefresh: () => void;
  /**
   * Realizes backend effects for a viewport-only page-stack synchronization.
   *
   * @param realization - Mounted frames and the subset requiring fresh backend work.
   */
  readonly realizeViewport: (
    realization: MountedPaginatedSurfaceRealization<Surface>
  ) => void;
  /**
   * Observes the canonical visible-page set after replacement or viewport sync.
   *
   * @param pageIndices - Ascending visible page indices including buffer pages.
   */
  readonly onVisiblePagesChange?:
    | ((pageIndices: readonly number[]) => void)
    | undefined;
}

/** Canonical viewport, page snapshot, mounted-frame, and teardown authority. */
export interface MountedPaginatedSurfaceLifecycle<Surface> {
  /**
   * Reads the visible document-space viewport.
   *
   * @returns Current visible document region.
   */
  getVisibleRegion(): QuireRect;
  /**
   * Scrolls the viewport by a document-space distance.
   *
   * @param deltaY - Vertical distance in document coordinates; positive scrolls down.
   * @returns Whether the scroll source supports programmatic scrolling.
   */
  scrollByDocument(deltaY: number): boolean;
  /**
   * Reports whether the current clip coverage holds every page visible at the current scroll position.
   *
   * @param pageRects - Page rectangles of the snapshot about to be installed.
   * @param bufferPages - Neighbouring-page buffer.
   * @returns Whether frames can be painted without another document render.
   */
  coversViewport(pageRects: readonly QuireRect[], bufferPages: number): boolean;
  /**
   * Resolves the render preparation window before or after installing a page snapshot.
   * During a viewport refresh, clip construction and mounting share the same
   * scoped indices; outside that call, the configured full buffer is returned.
   *
   * @param pageRects - Page rectangles in document order.
   * @param bufferPages - Optional neighbouring-page buffer override.
   * @returns Ascending visible page indices.
   */
  resolveVisiblePageIndices(
    pageRects: readonly QuireRect[],
    bufferPages?: number
  ): readonly number[];
  /**
   * Synchronizes mounted frames with the current visible region.
   *
   * This explicit entry point is used when a backend bridge becomes ready
   * after the viewport subscription was created.
   *
   * @param bufferPages - Optional neighbouring-page buffer override for this
   * synchronization.
   */
  syncViewport(bufferPages?: number): void;
  /**
   * Replaces the current page snapshot and synchronizes mounted page surfaces.
   *
   * @param options - New pages and optional buffer override.
   * @returns Canonical mounted-frame realization after replacement.
   */
  replacePages(
    options: ReplaceMountedPaginatedSurfacePagesOptions
  ): MountedPaginatedSurfaceRealization<Surface>;
  /**
   * Reads the current layout page snapshot.
   *
   * @returns Current pages in document order.
   */
  getPages(): readonly QuireLayoutPage[];
  /**
   * Reads current page rectangles in document space.
   *
   * @returns Current page rectangles in document order.
   */
  getPageRects(): readonly QuireRect[];
  /**
   * Reads every currently mounted page frame.
   *
   * @returns Mounted page frames in ascending page order.
   */
  getFrames(): readonly QuirePageFrame<Surface>[];
  /**
   * Hides loading chrome after successful backend painting.
   * @param frames - Mounted frames whose content and overlays are ready.
   */
  markPainted(frames: readonly QuirePageFrame<Surface>[]): void;
  /** Releases viewport subscription, mounted surfaces, pool, and scroll source once. */
  destroy(): void;
}

/** Inputs used to select mounted update cadence. */
export interface ResolveMountedViewUpdateScheduleModeOptions {
  /** Semantic reason for the mounted update. */
  readonly reason: string;
  /** Whether the mounted view currently owns editing focus. */
  readonly focused: boolean;
}

/** Backend request accepted by the canonical mounted update lifecycle. */
export interface MountedViewScheduledUpdateRequest<TReason extends string = string> {
  /** Semantic reason for the mounted update. */
  readonly reason: TReason;
  /** Applied transactions that contributed to this update. */
  readonly transactions?: readonly Transaction[] | undefined;
  /** Optional transient IME preedit carried by a composition update. */
  readonly imePreedit?: unknown;
}

/** Metadata captured when one mounted update enters the shared scheduler. */
export interface MountedViewScheduledUpdateMetadata {
  /** Whether the update executes immediately or on the next frame. */
  readonly scheduleMode: MountedViewUpdateScheduleMode;
  /** State and layout revision captured for stale-work rejection. */
  readonly revision: MountedViewUpdateRevision;
}

/** Scheduled mounted update composed from a backend request and shared metadata. */
export type MountedViewScheduledUpdate<
  TRequest extends MountedViewScheduledUpdateRequest
> = TRequest & MountedViewScheduledUpdateMetadata;

/** Observable phase in the canonical mounted update lifecycle. */
export type MountedViewScheduledUpdatePhase = "request" | "render";

/** Diagnostic event emitted by the canonical mounted update lifecycle. */
export interface MountedViewScheduledUpdateEvent<
  TRequest extends MountedViewScheduledUpdateRequest
> {
  /** Lifecycle phase that just completed. */
  readonly phase: MountedViewScheduledUpdatePhase;
  /** Scheduled update associated with the phase. */
  readonly update: MountedViewScheduledUpdate<TRequest>;
  /** Current scheduler counters after the phase. */
  readonly counters: MountedViewUpdateSchedulerCounters;
}

/** Options used to create one canonical mounted scheduled-update lifecycle. */
export interface CreateMountedViewScheduledUpdateLifecycleOptions<
  TRequest extends MountedViewScheduledUpdateRequest
> {
  /**
   * Reads whether this mounted view currently owns editing focus.
   *
   * @returns Whether focused mutation updates should coalesce to a frame.
   */
  readonly readFocused: () => boolean;
  /**
   * Decides whether one request invalidates layout-derived work.
   *
   * @param request - Backend request entering the shared lifecycle.
   * @returns Whether the layout epoch must advance.
   */
  readonly invalidatesLayout: (request: TRequest) => boolean;
  /**
   * Executes one fresh mounted render update.
   *
   * @param update - Coalesced update accepted by the scheduler.
   */
  readonly execute: (update: MountedViewScheduledUpdate<TRequest>) => void;
  /** Records post-update work when a focused mutation requests a frame. */
  readonly requestDeferredPostUpdate?: (() => void) | undefined;
  /** Completes pending base-view work after a current render commits. */
  readonly completeDeferredPostUpdate?: (() => void) | undefined;
  /** Suspends background fill while focused interaction waits for a frame. */
  readonly postponeInteraction?: (() => void) | undefined;
  /** Resumes background fill after a focused interaction render completes. */
  readonly resumeInteraction?: (() => void) | undefined;
  /**
   * Observes request and render phases for backend diagnostics.
   *
   * @param event - Shared lifecycle phase and scheduler counters.
   */
  readonly onSchedule?: ((
    event: MountedViewScheduledUpdateEvent<TRequest>
  ) => void) | undefined;
  /**
   * Requests a frame callback from the mounted host.
   *
   * @param callback - Callback to run on the next frame.
   * @returns Opaque frame handle used for cancellation.
   */
  readonly requestFrame?: ((callback: () => void) => number) | undefined;
  /**
   * Cancels a frame requested from the mounted host.
   *
   * @param handle - Opaque frame handle returned by `requestFrame`.
   */
  readonly cancelFrame?: ((handle: number) => void) | undefined;
}

/** Canonical scheduling and revision authority owned by one mounted view. */
export interface MountedViewScheduledUpdateLifecycle<
  TRequest extends MountedViewScheduledUpdateRequest
> {
  /**
   * Requests one mounted update through the canonical cadence and revision rules.
   *
   * @param request - Backend render request without scheduler metadata.
   */
  request(request: TRequest): void;
  /**
   * Resolves the current cadence for one semantic update reason.
   *
   * @param reason - Semantic reason for the mounted update.
   * @returns Synchronous or frame-coalesced schedule mode.
   */
  resolveMode(reason: TRequest["reason"]): MountedViewUpdateScheduleMode;
  /**
   * Reads the newest mounted state and layout revision.
   *
   * @returns Current immutable revision snapshot.
   */
  currentRevision(): MountedViewUpdateRevision;
  /**
   * Flushes pending frame work immediately.
   *
   * @returns Whether a pending update was rendered.
   */
  flush(): boolean;
  /**
   * Reads stable scheduler counters for diagnostics.
   *
   * @returns Current scheduler counters.
   */
  getCounters(): MountedViewUpdateSchedulerCounters;
  /** Cancels pending work and prevents later renders. */
  destroy(): void;
}
