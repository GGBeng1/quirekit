import type { QuireDrawingManipulatingState } from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import type { MountedDrawingPreviewState } from "../drawing-interaction";
import { createMountedDrawingPreviewRenderResult } from "../render-result";
import { resolveDrawingPreviewFrameScheduler } from "./drawing-preview-frame";
import type { CreateMountedPaginatedTransientPresentationOptions } from "./types";

/** Frame-coalesced drawing preview ownership for one paginated mounted facade. */
export class MountedPaginatedDrawingPreviewPresentation {
  private readonly requestFrame: (callback: () => void) => number;
  private readonly cancelFrame: (handle: number) => void;
  private drawingPreviewState: MountedDrawingPreviewState | null = null;
  private drawingPreviewBaseRenderResult: QuireViewRenderResult | undefined;
  private pendingState: MountedDrawingPreviewState | undefined;
  private pendingFrameHandle: number | undefined;
  private frameEpoch = 0;
  private destroyed = false;

  /**
   * Creates display-cadence drawing preview ownership.
   *
   * @param options - Mounted presentation adapters and optional frame hooks.
   * @param readCaretVisible - Reads whether the overlay caret should be painted.
   */
  constructor(
    private readonly options: CreateMountedPaginatedTransientPresentationOptions,
    private readonly readCaretVisible: () => boolean
  ) {
    const frameScheduler = resolveDrawingPreviewFrameScheduler(options);
    this.requestFrame = frameScheduler.request;
    this.cancelFrame = frameScheduler.cancel;
  }

  /**
   * Queues the latest active state, or synchronously restores accepted paint.
   *
   * @param state - Active manipulation state, or null for cancellation.
   */
  set(state: MountedDrawingPreviewState | null): void {
    if (this.destroyed) {
      return;
    }
    if (state === null) {
      this.cancelPendingFrame();
      this.present(null);
      return;
    }

    this.pendingState = state;
    if (this.pendingFrameHandle !== undefined) {
      return;
    }

    const epoch = this.frameEpoch;
    this.pendingFrameHandle = this.requestFrame(() => {
      this.runFrame(epoch);
    });
  }

  /** Cancels queued speculative work after an authoritative full render. */
  syncAfterRender(): void {
    this.cancelPendingFrame();
    this.drawingPreviewState = null;
    this.drawingPreviewBaseRenderResult = undefined;
  }

  /** Cancels queued work and prevents future preview presentation. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }
    this.cancelPendingFrame();
    this.drawingPreviewState = null;
    this.drawingPreviewBaseRenderResult = undefined;
    this.destroyed = true;
  }

  /**
   * Presents the latest state when its scheduled frame is still current.
   *
   * @param epoch - Frame epoch captured when the callback was requested.
   */
  private runFrame(epoch: number): void {
    if (this.destroyed || epoch !== this.frameEpoch) {
      return;
    }

    const state = this.pendingState;
    this.pendingState = undefined;
    this.pendingFrameHandle = undefined;
    if (state !== undefined) {
      this.present(state);
    }
  }

  /**
   * Builds and paints one speculative frame from the accepted render result.
   *
   * @param state - Active state to present, or null to restore accepted paint.
   */
  private present(state: MountedDrawingPreviewState | null): void {
    const previousRenderResult = this.options.readRenderResult();
    const ownerState = state ?? this.drawingPreviewState;
    if (previousRenderResult === undefined || ownerState === null) {
      this.drawingPreviewState = state;
      return;
    }

    // Every displayed pointer frame derives from one accepted authority. This
    // prevents preview-on-preview drift and makes cancellation exact.
    const acceptedRenderResult = this.drawingPreviewBaseRenderResult
      ?? previousRenderResult;
    if (state !== null && this.drawingPreviewBaseRenderResult === undefined) {
      this.drawingPreviewBaseRenderResult = acceptedRenderResult;
    }
    const layoutPreview = resolveDrawingLayoutPreview(
      this.options,
      state,
      acceptedRenderResult
    );
    const renderResult = state === null
      ? acceptedRenderResult
      : layoutPreview ?? createMountedDrawingPreviewRenderResult({
          previousRenderResult: acceptedRenderResult,
          state: ownerState,
          active: true,
          prepareDrawingPreviewContent: this.options.prepareDrawingPreviewContent,
          ...(this.options.surfaceConfig === undefined
            ? {}
            : { surfaceConfig: this.options.surfaceConfig })
        });
    const shouldRepaintContent = ownsDrawingContent(state)
      || ownsDrawingContent(this.drawingPreviewState)
      || layoutPreview !== undefined;

    this.options.commitRenderResult(renderResult);
    const caretVisible = this.readCaretVisible();
    if (shouldRepaintContent) {
      this.options.repaintDrawingPreview(renderResult, caretVisible);
    } else {
      this.options.repaintOverlay(caretVisible);
    }
    this.drawingPreviewState = state;
    if (state === null) {
      this.drawingPreviewBaseRenderResult = undefined;
    }
  }

  /** Cancels the pending callback and discards its unpainted state. */
  private cancelPendingFrame(): void {
    if (this.pendingFrameHandle !== undefined) {
      this.cancelFrame(this.pendingFrameHandle);
      this.pendingFrameHandle = undefined;
      this.frameEpoch += 1;
    }
    this.pendingState = undefined;
  }
}

/**
 * Builds a full layout preview only for source-backed manipulation states.
 *
 * @param options - Mounted presentation capabilities.
 * @param state - Active preview state, or null while restoring.
 * @param acceptedRenderResult - Stable accepted render authority.
 * @returns Full speculative result, or undefined for command projection.
 */
function resolveDrawingLayoutPreview(
  options: CreateMountedPaginatedTransientPresentationOptions,
  state: MountedDrawingPreviewState | null,
  acceptedRenderResult: QuireViewRenderResult
): QuireViewRenderResult | undefined {
  return state !== null && state.kind !== "creating"
    ? options.buildDrawingLayoutPreview?.(
        state as QuireDrawingManipulatingState,
        acceptedRenderResult
      )
    : undefined;
}

/**
 * Reports whether one preview family mutates the mounted content plane.
 *
 * @param state - Presented or pending drawing state.
 * @returns Whether content plus chrome must be repainted.
 */
function ownsDrawingContent(state: MountedDrawingPreviewState | null): boolean {
  return state?.kind === "creating"
    || state?.kind === "moving"
    || state?.kind === "resizing"
    || state?.kind === "controlling";
}
