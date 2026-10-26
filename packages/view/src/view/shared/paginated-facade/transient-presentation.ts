import { syncQuireDomOverlays } from "../../../overlay";
import { resolveMountedCaretOmitsOverlayCaret } from "../caret";
import { resolveMountedPointerCursor } from "../pointer";
import {
  canReuseMountedSelectionOverlayRenderResult,
  createMountedSelectionUpdateRenderResult
} from "../render-result";
import type { QuireViewUpdatePatch } from "@quirekit/view-engine";
import type { MountedDrawingPreviewState } from "../drawing-interaction";
import type { QuireViewRenderResult } from "../../types";
import type { QuireMountedCaretMode } from "../types";
import type { MountedPaginatedDocumentRenderRequest } from "../paginated-render-flow";
import type {
  CreateMountedPaginatedTransientPresentationOptions,
  MountedPaginatedTransientPresentation,
  MountedPaginatedTransientRenderSyncOptions
} from "./types";
import { MountedPaginatedCaretPresentation } from "./caret-presentation";
import { MountedPaginatedDrawingPreviewPresentation } from "./drawing-preview-presentation";

/** Shared transient presentation lifecycle for one paginated mounted facade. */
class DefaultMountedPaginatedTransientPresentation
  implements MountedPaginatedTransientPresentation {
  private readonly caretPresentation: MountedPaginatedCaretPresentation;
  private readonly drawingPreviewPresentation: MountedPaginatedDrawingPreviewPresentation;

  /**
   * Creates caret and transient synchronization ownership.
   *
   * @param options - Mounted state accessors plus backend presentation adapters.
   */
  constructor(
    private readonly options: CreateMountedPaginatedTransientPresentationOptions
  ) {
    this.caretPresentation = new MountedPaginatedCaretPresentation(options);
    this.drawingPreviewPresentation =
      new MountedPaginatedDrawingPreviewPresentation(
        options,
        () => this.overlayCaretVisible()
      );
  }

  /** @inheritdoc */
  canReuseSelectionUpdate(
    reason?: string,
    request?: MountedPaginatedDocumentRenderRequest<string>
  ): boolean {
    const previousRenderResult = this.options.readRenderResult();
    if (
      previousRenderResult === undefined
      || !this.options.isSelectionUpdateReady()
      || (reason !== "selection" && reason !== "transaction")
    ) {
      return false;
    }

    return canReuseMountedSelectionOverlayRenderResult({
      decorationSourceView: this.options.decorationSourceView,
      previousRenderResult,
      state: this.options.readState(),
      requireMaterializedSelectionTextblock: true,
      frameOptions: () => request === undefined
        ? undefined
        : this.options.readSelectionBuildOptions?.(request)
    });
  }

  /** @inheritdoc */
  setDrawingPreview(state: MountedDrawingPreviewState | null): void {
    this.drawingPreviewPresentation.set(state);
  }

  /** @inheritdoc */
  renderSelectionUpdate(
    reason: string | undefined,
    updatePatch: QuireViewUpdatePatch | null | undefined
  ): QuireViewRenderResult {
    const previousRenderResult = this.options.readRenderResult();
    if (previousRenderResult === undefined) {
      throw new RangeError(
        "Cannot render paginated transient presentation before a full render"
      );
    }

    // Phase 1: derive every transient product from one retained snapshot. Exact
    // backend measurement may refine geometry, but it cannot replace ownership.
    const baseRenderResult = createMountedSelectionUpdateRenderResult({
      previousRenderResult,
      state: this.options.readState(),
      selectionContext: this.options.readSelectionContext(),
      updatePatch,
      refreshPageDisplayListChunks: true,
      ...(resolveMountedCaretOmitsOverlayCaret(this.options.caretRendering)
        ? { omitCaretCommands: true }
        : {}),
      ...(this.options.displayListStyles === undefined
        ? {}
        : { displayListStyles: this.options.displayListStyles }),
      ...(this.options.surfaceConfig === undefined
        ? {}
        : { surfaceConfig: this.options.surfaceConfig })
    });
    const renderResult = this.options.refineSelectionRenderResult?.(
      baseRenderResult
    ) ?? baseRenderResult;

    // Phase 2: commit before presenting so widget routing, overlays, caret, and
    // input proxy all observe the same selection revision.
    this.options.commitRenderResult(renderResult);
    const paintedCaretVisible = this.overlayCaretVisible();
    this.options.setWidgetTargets(renderResult);
    this.syncDomOverlays(renderResult);
    this.syncDefaultCursor();
    this.options.repaintOverlay(paintedCaretVisible);
    this.syncCaret({ overlayPaintedCaretVisible: paintedCaretVisible });
    this.options.syncInputProxy(renderResult);
    this.options.onSelectionUpdate?.({
      renderResult,
      ...(reason === undefined ? {} : { reason })
    });

    return renderResult;
  }

  /** @inheritdoc */
  syncAfterRender(
    options: MountedPaginatedTransientRenderSyncOptions = {}
  ): void {
    this.drawingPreviewPresentation.syncAfterRender();
    const renderResult = this.options.readRenderResult();
    if (renderResult === undefined) {
      return;
    }

    this.syncDomOverlays(renderResult);
    this.options.syncInputProxy(renderResult);
    this.syncDefaultCursor();
    this.syncCaret(options);
  }

  /** @inheritdoc */
  setFocused(focused: boolean): void {
    this.options.setFocusedState(focused);
    if (this.options.readDestroyed()) {
      return;
    }

    const editable = this.options.readEditable();
    this.caretPresentation.setFocused(focused, editable);
  }

  /** @inheritdoc */
  setCaretMode(mode: QuireMountedCaretMode): void {
    if (this.options.readDestroyed()) {
      return;
    }

    this.caretPresentation.setMode(mode);
  }

  /** @inheritdoc */
  get caretMode(): QuireMountedCaretMode {
    return this.caretPresentation.mode;
  }

  /** @inheritdoc */
  overlayCaretVisible(): boolean {
    return this.caretPresentation.overlayCaretVisible();
  }

  /** @inheritdoc */
  destroy(): void {
    this.drawingPreviewPresentation.destroy();
    this.caretPresentation.destroy();
  }

  /**
   * Synchronizes backend-independent DOM overlay presentation.
   *
   * @param renderResult - Committed result whose overlays should mount.
   */
  private syncDomOverlays(
    renderResult: QuireViewRenderResult
  ): void {
    syncQuireDomOverlays({
      host: this.options.overlayHost,
      overlays: renderResult.domOverlays
    });
  }

  /** Applies the resting cursor without replacing retained-target ownership. */
  private syncDefaultCursor(): void {
    const pointerSurface = this.options.readPointerSurface();
    const editable = this.options.readEditable();
    const currentCursor = pointerSurface.style.cursor || "";

    if (!editable) {
      pointerSurface.style.cursor = "";
      return;
    }

    // Pointer movement owns explicit retained-target cursors such as pointer,
    // move, and resize. A transaction render must not downgrade that ownership
    // to the text I-beam while the physical pointer has not moved.
    if (
      currentCursor !== ""
      && currentCursor !== "text"
    ) {
      return;
    }

    pointerSurface.style.cursor = resolveMountedPointerCursor({
      overContent: true,
      editable
    });
  }

  /**
   * Synchronizes the active caret presentation after a committed render.
   *
   * @param options - Optional visibility already painted by backend overlays.
   */
  private syncCaret(options: MountedPaginatedTransientRenderSyncOptions): void {
    this.caretPresentation.syncAfterRender(
      this.options.readFocused(),
      this.options.readEditable(),
      this.options.readRenderResult(),
      options
    );
  }
}

/**
 * Creates canonical transient presentation ownership for a paginated mount.
 *
 * @param options - Mounted state accessors plus backend presentation adapters.
 * @returns Shared selection, overlay, caret, input-proxy, and cursor lifecycle.
 */
export function createMountedPaginatedTransientPresentation(
  options: CreateMountedPaginatedTransientPresentationOptions
): MountedPaginatedTransientPresentation {
  return new DefaultMountedPaginatedTransientPresentation(options);
}
