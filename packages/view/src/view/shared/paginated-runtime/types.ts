import type { QuireImePreedit } from "@quirekit/view-engine";
import type { QuireViewHost } from "@quirekit/renderer";
import type { QuireViewRenderResult } from "../../types";
import type {
  CreateMountedViewInteractionLifecycleOptions,
  CreateMountedViewScheduledUpdateLifecycleOptions,
  MountedViewInteractionLifecycle,
  MountedViewScheduledUpdateLifecycle,
  MountedViewScheduledUpdateRequest
} from "../lifecycle";
import type {
  CreateMountedPaginatedGeometryFacadeOptions,
  CreateMountedPaginatedTransientPresentationOptions,
  MountedPaginatedGeometryFacade,
  MountedPaginatedTransientPresentation
} from "../paginated-facade";
import type {
  CreateMountedPaginatedRenderFlowOptions,
  MountedPaginatedRenderFlow,
  MountedPaginatedRenderUpdate
} from "../paginated-render-flow";
import type { QuireMountedViewUpdateReason } from "../types";
import type { QuireMountedEditorViewElements } from "../types";

/** Canonical render reasons shared by mounted paginated backends. */
export type MountedPaginatedViewRenderReason =
  | QuireMountedViewUpdateReason
  | "initial"
  | "manual"
  | "fill"
  | "scroll"
  | "image-paint"
  | "presentation-overlay";

/** Request accepted by the canonical paginated mounted runtime. */
export type MountedPaginatedRuntimeRequest =
  MountedViewScheduledUpdateRequest<MountedPaginatedViewRenderReason>
  & MountedPaginatedRenderUpdate<MountedPaginatedViewRenderReason>;

/** Scheduling capabilities supplied by one paginated backend. */
export type MountedPaginatedRuntimeSchedulingOptions = Omit<
  CreateMountedViewScheduledUpdateLifecycleOptions<MountedPaginatedRuntimeRequest>,
  "execute"
>;

/** Interaction capabilities supplied by one paginated backend. */
export interface MountedPaginatedRuntimeInteractionOptions {
  /** Stable mounted host, editor, input proxy, and widget action capabilities. */
  readonly lifecycle: Omit<
    CreateMountedViewInteractionLifecycleOptions,
    "getInteractionSnapshot" | "render" | "onFocusChange"
  >;
  /**
   * Observes focus after canonical transient state has been updated.
   *
   * @param focused - Whether the mounted input proxy owns focus.
   */
  readonly onFocusChange?: ((focused: boolean) => void) | undefined;
}

/** Transient-presentation capabilities supplied by one paginated backend. */
export interface MountedPaginatedRuntimePresentationOptions {
  /** Stable caret, focus, overlay, pointer, and styling capabilities. */
  readonly lifecycle: Omit<
    CreateMountedPaginatedTransientPresentationOptions,
    | "readRenderResult"
    | "commitRenderResult"
    | "readSelectionContext"
    | "setWidgetTargets"
    | "syncInputProxy"
  >;
  /**
   * Synchronizes the backend input proxy from committed runtime state.
   *
   * @param renderResult - Current committed render result.
   * @param imePreedit - Current speculative IME state.
   */
  readonly syncInputProxy: (
    renderResult: QuireViewRenderResult,
    imePreedit: QuireImePreedit | undefined
  ) => void;
}

/** Render-flow capabilities supplied by one paginated backend. */
export interface MountedPaginatedRuntimeRenderFlowOptions {
  /** Stable reason identities, editor facts, fill planning, and document renderer. */
  readonly lifecycle: Omit<
    CreateMountedPaginatedRenderFlowOptions<MountedPaginatedViewRenderReason>,
    "canReuseSelectionUpdate" | "renderSelectionUpdate" | "canRefreshDocument"
  >;
  /** Reports whether this backend currently permits retained selection reuse. */
  readonly allowsSelectionReuse: () => boolean;
  /** Reports whether backend presentation resources can refresh the document. */
  readonly isDocumentPresentationReady: () => boolean;
}

/** Options used to create one canonical paginated mounted runtime. */
export interface CreateMountedPaginatedRuntimeOptions {
  /** Mounted update cadence, revision, and background-fill integrations. */
  readonly scheduling: MountedPaginatedRuntimeSchedulingOptions;
  /** Mounted input, widget, focus, target, and cleanup capabilities. */
  readonly interaction: MountedPaginatedRuntimeInteractionOptions;
  /** Renderer-neutral geometry plus optional exact backend refinements. */
  readonly geometry: Omit<
    CreateMountedPaginatedGeometryFacadeOptions,
    "readRenderResult" | "readSelectionContext"
  >;
  /** Selection, caret, overlay, cursor, and input-proxy presentation. */
  readonly presentation: MountedPaginatedRuntimePresentationOptions;
  /** IME, selection-reuse, fill, refresh, and document-render flow. */
  readonly renderFlow: MountedPaginatedRuntimeRenderFlowOptions;
}

/** Browser elements required by every paginated mounted backend. */
export interface MountedPaginatedEditorViewElements
  extends QuireMountedEditorViewElements {
  /** DOM host used for transient caret and node-view presentation. */
  readonly overlayHost: HTMLElement;
  /** Hidden textarea that owns keyboard, IME, and clipboard input. */
  readonly inputProxy: HTMLTextAreaElement;
}

/** Scheduling capabilities that remain backend-specific after base ownership. */
export type MountedPaginatedEditorViewSchedulingOptions = Omit<
  MountedPaginatedRuntimeSchedulingOptions,
  "readFocused" | "requestDeferredPostUpdate" | "completeDeferredPostUpdate"
>;

/** Interaction capabilities that remain backend-specific after base ownership. */
export interface MountedPaginatedEditorViewInteractionOptions {
  /** Renderer-neutral identity and surface metadata for the mounted backend. */
  readonly host: QuireViewHost;
  /**
   * Projects drawing-creation ownership onto the backend cursor surface.
   *
   * @param active - Whether a creation tool is armed or captured.
   */
  readonly onDrawingCreationActiveChange?:
    | ((active: boolean) => void)
    | undefined;
  /**
   * Observes focus after canonical transient state has been updated.
   *
   * @param focused - Whether the mounted input proxy owns focus.
   */
  readonly onFocusChange?: ((focused: boolean) => void) | undefined;
}

/** Transient-presentation capabilities that remain backend-specific. */
export interface MountedPaginatedEditorViewPresentationOptions {
  /** Backend caret, pointer, styling, and retained-presentation capabilities. */
  readonly lifecycle: Omit<
    MountedPaginatedRuntimePresentationOptions["lifecycle"],
    | "ownerDocument"
    | "overlayHost"
    | "readState"
    | "decorationSourceView"
    | "readFocused"
    | "readEditable"
    | "readDestroyed"
    | "setFocusedState"
  >;
  /**
   * Synchronizes the backend input proxy from committed runtime state.
   *
   * @param renderResult - Current committed render result.
   * @param imePreedit - Current speculative IME state.
   */
  readonly syncInputProxy: (
    renderResult: QuireViewRenderResult,
    imePreedit: QuireImePreedit | undefined
  ) => void;
}

/** Document-render capabilities that remain backend-specific. */
export interface MountedPaginatedEditorViewRenderFlowOptions {
  /** Backend fill planning and document realization capabilities. */
  readonly lifecycle: Omit<
    MountedPaginatedRuntimeRenderFlowOptions["lifecycle"],
    | "initialReason"
    | "documentReplaceReason"
    | "transactionReason"
    | "compositionReason"
    | "readDestroyed"
    | "readFocused"
    | "readTopLevelBlockCount"
    | "readSelectionHeadTopLevelBlockIndex"
  >;
  /** Reports whether this backend currently permits retained selection reuse. */
  readonly allowsSelectionReuse: () => boolean;
  /** Reports whether backend presentation resources can refresh the document. */
  readonly isDocumentPresentationReady: () => boolean;
}

/** Backend capabilities used to initialize one paginated mounted-view base. */
export interface InitializeMountedPaginatedEditorViewOptions {
  /** Backend cadence, invalidation, and page-fill scheduling capabilities. */
  readonly scheduling: MountedPaginatedEditorViewSchedulingOptions;
  /** Backend host identity and optional focus observer. */
  readonly interaction: MountedPaginatedEditorViewInteractionOptions;
  /** Renderer-neutral geometry plus optional exact backend refinements. */
  readonly geometry: CreateMountedPaginatedRuntimeOptions["geometry"];
  /** Backend caret, pointer, styling, and input-proxy presentation. */
  readonly presentation: MountedPaginatedEditorViewPresentationOptions;
  /** Backend fill planning and document realization capabilities. */
  readonly renderFlow: MountedPaginatedEditorViewRenderFlowOptions;
}

/** Canonical shared ownership root for one Canvas or SVG paginated mount. */
export interface MountedPaginatedRuntime {
  /** Canonical scheduled-update lifecycle. */
  readonly updates: MountedViewScheduledUpdateLifecycle<MountedPaginatedRuntimeRequest>;
  /** Canonical input, widget, focus, target, and cleanup lifecycle. */
  readonly interaction: MountedViewInteractionLifecycle;
  /** Canonical renderer-neutral geometry facade. */
  readonly geometry: MountedPaginatedGeometryFacade;
  /** Canonical selection, caret, overlay, and input-proxy presentation. */
  readonly presentation: MountedPaginatedTransientPresentation;
  /** Canonical IME, reuse, refresh, fill, and document-render flow. */
  readonly renderFlow: MountedPaginatedRenderFlow<MountedPaginatedViewRenderReason>;
  /** Latest full or transient result committed by this runtime. */
  readonly renderResult: QuireViewRenderResult | undefined;
  /**
   * Commits a full backend result and its widget targets atomically.
   *
   * @param renderResult - Backend document result to make authoritative.
   */
  commitRenderResult(renderResult: QuireViewRenderResult): void;
  /** Releases every owned lifecycle once in dependency-safe order. */
  destroy(): void;
}
