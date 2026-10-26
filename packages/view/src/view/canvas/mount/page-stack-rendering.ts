import { createMountedPaginatedBuildOptions } from "../../shared/paginated-render-flow/layout-options";
import { captureMountedViewScrollAnchor, restoreMountedViewScrollAnchor } from "../../shared/scroll/position-anchor";
import { buildDrawingPreviewCoverage } from "../../shared/paginated-facade/preview-coverage";
import type {
  QuireDrawingManipulatingState,
  QuireLayoutDirtyRange,
  QuireViewUpdatePatch
} from "@quirekit/view-engine";
import {
  deriveQuireViewUpdatePatch,
  quireDefaultLayoutFont,
  resolveQuireDocumentFont
} from "@quirekit/view-engine";
import { renderCanvasDisplayList } from "@quirekit/renderer";
import type { QuireImePreedit } from "@quirekit/view-engine";
import type {
  QuireViewMeasuredPhase,
  QuireViewRenderResult,
  QuireViewTraceSink
} from "../../types";
import { createQuireViewTraceSink, traceQuireViewPhase } from "../../facade/trace";
import {
  applyDocumentHeightSizing,
  createMountedDrawingLayoutPreviewPatch,
  createMountedPageOverlayDisplayList,
  realizeMountedPaginatedDocument,
  type QuirePageStackFillPassRequest,
  type QuirePageStackFillPassResult,
  type QuirePageStackFillRenderWindow
} from "../../shared";
import { resolveCanvasLayoutJobRejectionAction } from "../layout-jobs";
import { createCanvasMountedBuildOptions } from "../render-pass";
import {
  createCanvasPageStackSurfaceState
} from "../page-stack";
import { resolveCanvasMountedSurfaceMetrics } from "../surface";
import type { CanvasMountedRenderOrchestrationContext } from "./rendering";

/**
 * Pre-shapes one cooperative page-stack fill chunk and decides whether it can advance.
 *
 * @param context - Mounted resources and ownership checks for this view.
 * @param request - Fill block window and abort signal owned by the presentation.
 * @returns Whether shared fill should advance, retry, or stop.
 */
export async function executeCanvasMountedPageStackFillPass(
  context: CanvasMountedRenderOrchestrationContext,
  request: QuirePageStackFillPassRequest
): Promise<QuirePageStackFillPassResult> {
  const metrics = resolveCanvasMountedSurfaceMetrics({
    elements: context.elements,
    runtime: context.runtime
  });
  const revision = context.readCurrentRevision();
  const explicitFont = context.runtime.displayListStyles?.font;
  const font = explicitFont ?? resolveQuireDocumentFont(
    context.mountedView.state.doc,
    quireDefaultLayoutFont,
    "body"
  );
  const shaping = await context.backgroundShapingRuntime.shape({
    fromIndex: request.fromIndex,
    toIndex: request.toIndex,
    revision,
    width: context.runtime.pageGeometry?.bodyRect.width ?? metrics.viewportRect.width,
    font,
    applyDocumentFontTheme: explicitFont === undefined,
    lineHeight: context.textLayoutConfig.lineHeight,
    textBaselineOffset: context.textLayoutConfig.textBaselineOffset,
    lineBreakMode: context.textLayoutConfig.lineBreakMode
  });

  if (request.signal.aborted || context.isDestroyed() || !context.elements.pageStackHost) {
    return { action: "stop" };
  }
  if (!shaping.accepted) {
    const rejectionAction = resolveCanvasLayoutJobRejectionAction(shaping.reason);
    if (rejectionAction === "stop") {
      return { action: "stop" };
    }
    if (rejectionAction === "retry") {
      return { action: "retry" };
    }
    // A permanent accelerator failure cannot block document realization.
    // Fall through to canonical synchronous layout for this exact chunk.
  }

  if (shaping.accepted && request.complete) {
    const completeMetrics = resolveCanvasMountedSurfaceMetrics({
      elements: context.elements,
      runtime: context.runtime
    });
    const pageGeometry = context.runtime.pageGeometry;
    if (pageGeometry !== undefined) {
      const pagination = await context.remainderPaginationRuntime.paginate({
        revision,
        viewportRect: completeMetrics.viewportRect,
        pageGeometry,
        ...(explicitFont === undefined ? {} : { font: explicitFont }),
        textBaselineOffset: context.textLayoutConfig.textBaselineOffset,
        lineBreakMode: context.textLayoutConfig.lineBreakMode,
        ...(context.runtime.widows === undefined ? {} : { widows: context.runtime.widows }),
        ...(context.runtime.orphans === undefined ? {} : { orphans: context.runtime.orphans })
      });
      if (request.signal.aborted || context.isDestroyed() || !context.elements.pageStackHost) {
        return { action: "stop" };
      }
      if (!pagination.accepted) {
        const action = resolveCanvasLayoutJobRejectionAction(pagination.reason);
        if (action === "stop") {
          return { action: "stop" };
        }
        if (action === "retry") {
          return { action: "retry" };
        }
        // Permanent accelerator failures fall through to synchronous page driving.
      }
    }
  }
  return {
    action: "advance",
    render: request.complete || !shaping.accepted
  };
}

/**
 * Builds one targetless document result and paints it through retained page frames.
 *
 * @param context - Mounted resources and presentation callbacks for this view.
 * @param host - Page-stack host element.
 * @param imePreedit - Optional IME preedit.
 * @param layoutDirtyRange - Optional dirty range derived from triggering transactions.
 * @param updatePatch - Typed invalidation patch derived from the triggering update.
 * @param reason - Why the render ran, for diagnostics labeling.
 * @param fillWindow - Presentation-owned viewport-first shaping window.
 * @param anchored - Whether this render follows a scroll-anchor correction and must not anchor again.
 */
export function renderCanvasMountedPageStack(
  context: CanvasMountedRenderOrchestrationContext,
  host: HTMLElement,
  imePreedit: QuireImePreedit | undefined,
  layoutDirtyRange: QuireLayoutDirtyRange | null | undefined,
  updatePatch: QuireViewUpdatePatch | null | undefined,
  reason?: string,
  fillWindow?: QuirePageStackFillRenderWindow,
  anchored = false
): void {
  const pageStackPresentation = context.readPageStackPresentation();
  if (pageStackPresentation === undefined) {
    throw new RangeError(
      "Canvas page-stack render requires a paginated-surface lifecycle"
    );
  }

  const phases: QuireViewMeasuredPhase[] = [];
  const trace: QuireViewTraceSink = createQuireViewTraceSink(phases);
  // Read before layout replaces the geometry on screen; restored once the new height applies.
  const scrollAnchor = anchored ? null : captureMountedViewScrollAnchor(
    context.readRenderResult(), pageStackPresentation.getVisibleRegion()
  );
  const pageBuffer = context.runtime.scrollBufferPages ?? 1;
  const mountedPageBuffer = fillWindow?.initialWindowActive === true
    ? 0
    : pageBuffer;
  const metrics = resolveCanvasMountedSurfaceMetrics({
    elements: context.elements,
    runtime: context.runtime
  });
  const buildOptions = createMountedPaginatedBuildOptions(
    context.runtime, metrics.viewportRect, pageStackPresentation,
    { reason: reason ?? "manual", imePreedit, layoutDirtyRange, updatePatch, fillWindow },
    pageBuffer
  )!;
  const displayListClipRects = buildOptions.displayListClipRects;
  const renderResult = realizeMountedPaginatedDocument(
    context.view.buildRenderResult(
      {
        ...buildOptions,
        decorationSourceView: context.mountedView,
        trace,
        selectionContext: context.readSelectionContext(),
        activeAuxiliaryStorySourceId: context.readActiveAuxiliaryStorySourceId(),
        displayListTransform: context.imageResources.transformDisplayList
      }
    )
  );
  const pages = renderResult.layoutSnapshot?.pages ?? [];
  const surfaceState = createCanvasPageStackSurfaceState(
    metrics,
    renderResult.layoutSnapshot?.documentRect
  );

  context.writeSurfaceState(surfaceState);
  context.commitRenderResult(renderResult);
  pageStackPresentation.setDisplayListClipRects(displayListClipRects);

  if (renderResult.layoutSnapshot) {
    applyDocumentHeightSizing({
      bottomPadding: context.runtime.viewportPadding?.bottom,
      targets: {
        scrollSurface: context.elements.root,
        pageStackHost: host,
        coordinateSurface: context.elements.coordinateSurface
      },
      documentRect: renderResult.layoutSnapshot.documentRect
    });
  }
  // Before frames resolve against the scroll position, so they realize where the reader stays.
  const scrolled = restoreMountedViewScrollAnchor(scrollAnchor, renderResult, deltaY =>
    pageStackPresentation.scrollByDocument(deltaY));
  // A correction past the clip coverage needs geometry for the new position; the document is
  // unchanged, so the second render keeps the reader in place without moving again.
  if (scrolled && !pageStackPresentation.coversViewport(pages.map(page => page.pageRect), mountedPageBuffer)) {
    renderCanvasMountedPageStack(context, host, imePreedit, null,
      deriveQuireViewUpdatePatch({ reason: "scroll", layoutDirtyRange: null }), "scroll", fillWindow, true);
    return;
  }

  pageStackPresentation.updateDevicePixelRatio(metrics.devicePixelRatio);
  const { frames } = traceQuireViewPhase(trace, "page-stack-frame-sync", () =>
    ({
      frames: pageStackPresentation.replacePages(pages, mountedPageBuffer)
    })
  );
  // A full render rebuilds the document-space result, so every mounted frame is
  // repainted (not just the freshly mounted ones the scroll path paints).
  traceQuireViewPhase(trace, "page-stack-paint", () =>
    pageStackPresentation.paintFrames(
      frames,
      renderResult,
      metrics.devicePixelRatio
    )
  );
  context.syncPresentationAfterRender();
  context.runtime.onRender?.({
    view: context.mountedView,
    renderResult,
    strategy: "full",
    ...(reason === undefined ? {} : { reason }),
    viewportRect: metrics.viewportRect,
    displaySize: metrics.displaySize,
    devicePixelRatio: metrics.devicePixelRatio,
    phases,
    pageContentCache: pageStackPresentation.snapshotContentPaintCache()
  });
}

/**
 * Repaints retained overlay surfaces with the requested caret visibility.
 *
 * @param context - Mounted resources and presentation callbacks for this view.
 * @param caretVisible - Whether retained caret commands should paint.
 */
export function repaintCanvasMountedOverlay(
  context: CanvasMountedRenderOrchestrationContext,
  caretVisible: boolean
): void {
  const renderResult = context.readRenderResult();
  const surfaceState = context.readSurfaceState();
  if (!renderResult || !surfaceState) {
    return;
  }

  const pageStackPresentation = context.readPageStackPresentation();
  const pageStackFrames = pageStackPresentation?.getFrames();
  if (
    context.elements.pageStackHost
    && pageStackPresentation !== undefined
    && pageStackFrames?.length
  ) {
    const pageDisplayListChunks = renderResult.pageDisplayListChunks;
    if (pageDisplayListChunks === undefined) {
      throw new RangeError(
        "Mounted paginated overlay repaint requires pageDisplayListChunks."
      );
    }

    pageStackPresentation.repaintOverlays(
      pageDisplayListChunks,
      surfaceState.devicePixelRatio,
      caretVisible
    );
    return;
  }

  if (!surfaceState.overlayTarget) {
    return;
  }

  renderCanvasDisplayList({
    displayList: createMountedPageOverlayDisplayList(
      renderResult.overlayDisplayList,
      surfaceState.surfaceBounds,
      caretVisible
    ),
    target: surfaceState.overlayTarget,
    ...(context.runtime.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: context.runtime.glyphRunPainter })
  });
}

/**
 * Repaints transient drawing content and chrome on mounted page surfaces.
 *
 * @param context - Mounted resources and presentation callbacks for this view.
 * @param renderResult - Transient render products already committed by the runtime.
 * @param caretVisible - Whether retained caret commands should paint.
 */
export function repaintCanvasMountedDrawingPreview(
  context: CanvasMountedRenderOrchestrationContext,
  renderResult: QuireViewRenderResult,
  caretVisible: boolean
): void {
  const surfaceState = context.readSurfaceState();
  const pageStackPresentation = context.readPageStackPresentation();
  if (!surfaceState || !pageStackPresentation) {
    return;
  }
  pageStackPresentation.repaintDrawingPreview(
    renderResult,
    surfaceState.devicePixelRatio,
    caretVisible
  );
}

/**
 * Builds one isolated full-layout drawing preview for mounted page surfaces.
 *
 * @param context - Mounted resources and presentation callbacks for this view.
 * @param state - Active manipulation frame.
 * @param acceptedRenderResult - Stable result captured before the gesture.
 * @returns Speculative page-stack result, or undefined when ownership is stale.
 */
export function buildCanvasMountedDrawingLayoutPreview(
  context: CanvasMountedRenderOrchestrationContext,
  state: QuireDrawingManipulatingState,
  acceptedRenderResult: QuireViewRenderResult
): QuireViewRenderResult | undefined {
  if (
    context.elements.pageStackHost === undefined
    || context.readPageStackPresentation() === undefined
    || context.readSurfaceState() === undefined
  ) {
    return undefined;
  }
  const transientNodeLayoutPatch = createMountedDrawingLayoutPreviewPatch(
    acceptedRenderResult,
    state
  );
  if (transientNodeLayoutPatch === undefined) {
    return undefined;
  }
  const metrics = resolveCanvasMountedSurfaceMetrics({
    elements: context.elements,
    runtime: context.runtime
  });
  // The mounted page set can advance after the accepted gesture snapshot (fill
  // or scrolling). Preview must cover the surfaces being painted now.
  const clipRects = context.readPageStackPresentation()?.getFrames().map(frame => frame.pageRect);
  return buildDrawingPreviewCoverage(clipRects, currentClipRects => realizeMountedPaginatedDocument(
    context.view.buildTransientRenderResult(
      createCanvasMountedBuildOptions({
        metrics,
        decorationSourceView: context.mountedView,
        transientNodeLayoutPatch,
        selectionContext: context.readSelectionContext(),
        activeAuxiliaryStorySourceId: context.readActiveAuxiliaryStorySourceId(),
        ...(currentClipRects === undefined ? {} : { displayListClipRects: currentClipRects }),
        ...(currentClipRects === undefined ? {} : { layoutSnapshotClipRects: currentClipRects }),
        requirePageDisplayListChunks: true,
        displayListTransform: context.imageResources.transformDisplayList,
        runtime: context.runtime
      })
    )
  ), rects => context.readPageStackPresentation()!.resolveVisiblePageIndices(rects, context.runtime.scrollBufferPages ?? 1));
}
