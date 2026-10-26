import { createMountedPaginatedBuildOptions } from "../../shared/paginated-render-flow/layout-options";
import { captureMountedViewScrollAnchor, restoreMountedViewScrollAnchor } from "../../shared/scroll/position-anchor";
import type {
  QuireLayoutDirtyRange,
  QuireViewUpdatePatch
} from "@quirekit/view-engine";
import { deriveQuireViewUpdatePatch, type QuireImePreedit } from "@quirekit/view-engine";
import type { QuireView } from "../../facade";
import { createQuireViewTraceSink, traceQuireViewPhase } from "../../facade/trace";
import type {
  QuireViewDisplayListTransform,
  QuireViewMeasuredPhase,
  QuireViewRenderResult,
  QuireViewTraceSink
} from "../../types";
import {
  applyDocumentHeightSizing,
  realizeMountedPaginatedDocument,
  type QuirePageStackFillRenderWindow
} from "../../shared";
import {
  resolveSvgMountedPageStackSurfaceState,
  type SvgMountedRenderSurfaceState
} from "../surface";
import type {
  SvgMountedView,
  SvgMountedViewElements,
  SvgMountedViewRenderReason
} from "../types";
import { syncSvgMountedDocumentSurfaceGeometry } from "../dom";
import type { SvgPageStackPresentation } from ".";
import { runSvgMountedRenderPass } from "../render-pass";
import type { SvgMountedMutableRuntime } from "../resources";
import {
  adaptSvgPageStackDocumentCoordinates,
  createSvgPageStackDocumentSurfaceState
} from "./coordinates";

/** Options used to render one full SVG page-stack document frame. */
export interface RenderSvgMountedPageStackOptions {
  /** Shared render facade that owns renderer-neutral caches. */
  readonly view: QuireView;
  /** Mounted SVG view used as decoration source and render event view. */
  readonly mountedView: SvgMountedView;
  /** DOM elements owned by the mounted SVG view. */
  readonly elements: SvgMountedViewElements;
  /** Mutable runtime policy owned by the mounted SVG view. */
  readonly runtime: SvgMountedMutableRuntime;
  /** Backend page-stack presentation resource. */
  readonly pageStackPresentation: SvgPageStackPresentation;
  /** Optional mounted image/resource transform applied before SVG realization. */
  readonly displayListTransform?: QuireViewDisplayListTransform | undefined;
  /** Optional transient IME preedit. */
  readonly imePreedit?: QuireImePreedit | undefined;
  /** Optional layout dirty range derived from triggering transactions. */
  readonly layoutDirtyRange?: QuireLayoutDirtyRange | null | undefined;
  /** Optional typed update patch derived from triggering update. */
  readonly updatePatch?: QuireViewUpdatePatch | null | undefined;
  /** Mounted render reason used for diagnostics and clip policy. */
  readonly reason: SvgMountedViewRenderReason;
  /** Optional viewport-first fill window owned by page-stack presentation. */
  readonly fillWindow?: QuirePageStackFillRenderWindow | undefined;
  /** Current retained selection context, if any. */
  readonly selectionContext: Parameters<QuireView["buildRenderResult"]>[0]["selectionContext"];
  /** Active auxiliary story source currently owning explicit editing. */
  readonly activeAuxiliaryStorySourceId?: string | undefined;
  /** Reads whether the overlay caret was visible at paint time. */
  readonly overlayCaretVisible: () => boolean;
  /** Reads the render result currently on screen. */
  readonly readRenderResult: () => QuireViewRenderResult | undefined;
  /** Commits a render result into the mounted runtime. */
  readonly commitRenderResult: (renderResult: QuireViewRenderResult) => void;
  /** Synchronizes transient presentation after a full render. */
  readonly syncAfterRender: (options: {
    /** Whether the overlay repaint included a visible caret. */
    readonly overlayPaintedCaretVisible: boolean;
  }) => void;
  /** Reads the text measurer version accepted by layout cache invalidation. */
  readonly readTextMeasurerVersion: () => number | undefined;
  /** Whether this render follows a scroll-anchor correction and must not anchor again. */
  readonly anchored?: boolean | undefined;
}

/** Result returned after one full SVG page-stack render. */
export interface RenderSvgMountedPageStackResult {
  /** Current document-space SVG surface state. */
  readonly surfaceState: SvgMountedRenderSurfaceState;
  /** Text measurer version observed by the full render. */
  readonly textMeasurerVersion: number | undefined;
}

/**
 * Builds the document-space result once and paints each visible page to SVG frames.
 *
 * @param options - View, DOM, runtime, invalidation, and page-stack authorities.
 * @returns Surface state and text-measurer version accepted by this render.
 */
export function renderSvgMountedPageStack(
  options: RenderSvgMountedPageStackOptions
): RenderSvgMountedPageStackResult {
  const phases: QuireViewMeasuredPhase[] = [];
  const trace: QuireViewTraceSink = createQuireViewTraceSink(phases);
  const pageBuffer = 1;
  const mountedPageBuffer = options.fillWindow?.initialWindowActive === true
    ? 0
    : pageBuffer;
  const surfaceState = resolveSvgMountedPageStackSurfaceState(options.runtime);
  // Read before layout replaces the geometry on screen; restored once the new height applies.
  const scrollAnchor = options.anchored === true ? null : captureMountedViewScrollAnchor(
    options.readRenderResult(), options.pageStackPresentation.getVisibleRegion()
  );
  const buildOptions = createMountedPaginatedBuildOptions(
    options.runtime, surfaceState.viewportRect, options.pageStackPresentation,
    { reason: options.reason, imePreedit: options.imePreedit,
      layoutDirtyRange: options.layoutDirtyRange, updatePatch: options.updatePatch,
      fillWindow: options.fillWindow },
    pageBuffer
  )!;
  const displayListClipRects = buildOptions.displayListClipRects;
  const renderResult = runSvgMountedRenderPass({
    ...buildOptions,
    view: options.view,
    decorationSourceView: options.mountedView,
    surfaceState,
    runtime: options.runtime,
    displayListTransform: options.displayListTransform,
    trace,
    selectionContext: options.selectionContext,
    activeAuxiliaryStorySourceId: options.activeAuxiliaryStorySourceId
  });

  const pageStackSurfaceState = createSvgPageStackDocumentSurfaceState(
    surfaceState,
    renderResult.layoutSnapshot.documentRect
  );
  const pageStackRenderResult = adaptSvgPageStackDocumentCoordinates(
    realizeMountedPaginatedDocument(renderResult)
  );

  options.commitRenderResult(pageStackRenderResult);
  options.pageStackPresentation.setDisplayListClipRects(displayListClipRects);

  const pages = pageStackRenderResult.layoutSnapshot.pages ?? [];
  const documentRect = pageStackRenderResult.layoutSnapshot.documentRect;

  syncSvgMountedDocumentSurfaceGeometry(
    options.elements.documentSurface,
    documentRect
  );

  applyDocumentHeightSizing({
    bottomPadding: options.runtime.viewportPadding?.bottom,
    targets: {
      scrollSurface: options.elements.root,
      pageStackHost: options.elements.pageStackHost
    },
    documentRect
  });
  const scrolled = restoreMountedViewScrollAnchor(scrollAnchor, pageStackRenderResult, deltaY =>
    options.pageStackPresentation.scrollByDocument(deltaY));
  // A correction past the clip coverage needs geometry for the new position; the document is
  // unchanged, so the second render keeps the reader in place without moving again.
  if (scrolled && !options.pageStackPresentation.coversViewport(pages.map(page => page.pageRect), mountedPageBuffer)) {
    return renderSvgMountedPageStack({
      ...options, reason: "scroll", layoutDirtyRange: null, anchored: true,
      updatePatch: deriveQuireViewUpdatePatch({ reason: "scroll", layoutDirtyRange: null })
    });
  }

  traceQuireViewPhase(trace, "page-stack-frame-sync", () =>
    options.pageStackPresentation.replacePages(pages, mountedPageBuffer)
  );

  const paintedCaretVisible = options.overlayCaretVisible();
  const measuredRenderResult = traceQuireViewPhase(
    trace,
    "page-stack-paint",
    () => options.pageStackPresentation.paintAndMeasure(
      pageStackRenderResult,
      {
        caretVisible: paintedCaretVisible,
        preserveSelectionGeometry: options.imePreedit !== undefined,
        trace
      }
    )
  );

  options.commitRenderResult(measuredRenderResult);
  const textMeasurerVersion = options.readTextMeasurerVersion();
  options.syncAfterRender({
    overlayPaintedCaretVisible: paintedCaretVisible
  });
  options.runtime?.onRender?.({
    view: options.mountedView,
    renderResult: measuredRenderResult,
    strategy: "full",
    reason: options.reason,
    viewportRect: pageStackSurfaceState.viewportRect,
    displaySize: pageStackSurfaceState.displaySize,
    phases
  });

  return {
    surfaceState: pageStackSurfaceState,
    textMeasurerVersion
  };
}
