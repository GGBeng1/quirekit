export {
  BaseMountedEditorView,
  MountedDomCaret,
  bindMountedPointerSession,
  bindMountedResizeEvents,
  createMountedViewInteractionLifecycle,
  createMountedViewUpdateRevisionClock,
  createMountedViewUpdateScheduler,
  createQuireMountedSurfaceBounds,
  isMountedSelectionOverlayCommand,
  mergeMountedViewUpdateTransactions,
  readMountedInputProxyPositioningRoot,
  resolveMountedViewUpdateScheduleMode,
  resolveQuireMountedViewportRect,
  syncMountedInputProxyImePreeditVisibility,
  syncMountedInputProxyLayoutStyle
} from "../view/shared";
export type {
  BindMountedPointerSessionOptions,
  MountedHeaderFooterPointerSelectionPreparation,
  MountedPointerSelectionRenderMode,
  MountedViewInteractionLifecycle,
  MountedViewScrollRect,
  MountedViewUpdateRevisionClock,
  MountedViewUpdateSchedulerCounters,
  MountedWidgetEventRuntime,
  QuireMountedEditorView,
  QuireMountedEditorViewElements,
  QuireMountedEditorViewOptions,
  QuireMountedEditorViewUpdateOptions,
  QuireMountedViewUpdateReason,
  QuireMountedViewportPadding,
  QuireViewAdapter,
  QuireViewCoordsAtPosResult,
  QuireViewPosAtCoordsResult,
  QuireViewTextblockDirection,
  QuireViewViewportCoords
} from "../view/shared";
export type {
  MountedViewUpdateRequestOptions,
  MountedViewUpdateRevision
} from "../view/shared/update-scheduler/types";
export {
  beginMountedBlockPointerLease,
  validateMountedBlockPointerLease
} from "../view/shared/block-interaction";
export { createMountedPointerSelectionRenderer } from "../view/shared/lifecycle/selection-render";
export { resolveQuireImePreeditInputProxyMinWidth } from "../input";
export type {
  QuireClipboardOutputStrategy,
  QuireEditorInputBinding,
  QuireEditorInputBindingOptions
} from "../input";
export { syncQuireDomOverlays } from "../overlay";
export type {
  QuireMountedRenderResult,
  QuireMountedViewRenderEvent,
  QuireViewMeasuredPhase,
  QuireViewPointerHitTestResult,
  QuireViewPointerSelectionOptions
} from "../view/types";
