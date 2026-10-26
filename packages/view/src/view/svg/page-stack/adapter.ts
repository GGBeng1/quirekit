import {
  syncSvgContentDisplayListToSvg,
  syncSvgDisplayListToSvg
} from "@quirekit/renderer";
import {
  createMountedPageOverlayDisplayList,
  createQuirePageStackDisplayListPaintSignature,
  createQuirePageStackRectPaintSignature,
  resolveQuirePageStackDisplayListSourceForFrame,
  resolveQuirePageStackDisplayListsForFrames,
  type QuirePageStackDisplayListChunkIndex,
  type QuirePageFrame,
  type QuirePageSurfaceAdapter
} from "../../shared";
import { traceQuireViewPhase } from "../../facade/trace";
import type { QuireViewRenderResult, QuireViewTraceSink } from "../../types";
import type {
  SvgPageStackContentPaintCache,
  SvgPageStackContentPaintDecision
} from "./content-paint-cache";
import {
  applySvgPageStackFrameGeometry,
  createSvgPageStackFrameElements,
  type SvgPageStackFrameElements
} from "./frames";
import type { PaintSvgPageStackFrameOverlaysOptions } from "./types";

/**
 * Creates the SVG page surface adapter (one content + one overlay svg per page).
 * @returns SVG page surface adapter.
 */
export function createSvgPageSurfaceAdapter(): QuirePageSurfaceAdapter<SvgPageStackFrameElements> {
  return {
    markPainted(surface): void {
      surface.frame.style.visibility = "visible";
    },
    createSurface(ownerDocument: Document): SvgPageStackFrameElements {
      return createSvgPageStackFrameElements(ownerDocument);
    },
    applyGeometry(surface, pageIndex, pageRect): void {
      applySvgPageStackFrameGeometry(surface, pageIndex, pageRect);
    },
    attach(surface, host): void {
      host.appendChild(surface.frame);
    },
    detach(surface): void {
      surface.frame.remove();
    }
  };
}

/** Options used while painting a page's content SVG. */
export interface PaintSvgPageFrameContentOptions {
  /** Optional cache that skips syncing unchanged page content SVGs. */
  readonly contentPaintCache?: SvgPageStackContentPaintCache | undefined;
  /** Optional trace sink for page-stack paint diagnostics. */
  readonly trace?: QuireViewTraceSink | undefined;
  /** Optional display list already filtered to this page frame. */
  readonly pageDisplayList?: QuireViewRenderResult["contentDisplayList"] | undefined;
  /** Optional pre-resolved paint decision for this page frame. */
  readonly contentPaintDecision?: SvgPageStackContentPaintDecision | undefined;
}

/**
 * Paints a page's content svg from the document-space render result.
 *
 * The svg's viewBox scopes the document-space display list to this page, so the
 * full content list is handed in with the page rect as the viewport filter.
 *
 * @param frame - Manager frame over svg page elements.
 * @param renderResult - Document-space render artifacts.
 * @param options - Optional content paint cache.
 */
export function paintSvgPageFrameContent(
  frame: QuirePageFrame<SvgPageStackFrameElements>,
  renderResult: QuireViewRenderResult,
  options: PaintSvgPageFrameContentOptions = {}
): void {
  const pageDisplayList = options.pageDisplayList;
  const displayListSource = pageDisplayList === undefined
    ? resolveQuirePageStackDisplayListSourceForFrame({
        frame,
        pageDisplayListChunks: requireSvgPageStackDisplayListChunks(renderResult),
        layer: "content"
      })
    : {
        displayList: pageDisplayList,
        displayListIsViewportScoped: true as const
      };
  const contentPaintDecision = options.contentPaintDecision ?? traceQuireViewPhase(
    options.trace,
    "svg-page-content-cache-resolve",
    () => options.contentPaintCache?.resolve({
      frame,
      displayList: displayListSource.displayList,
      viewportRect: frame.pageRect,
      ...(displayListSource.displayListIsViewportScoped === true
        ? { displayListIsViewportScoped: true }
        : {})
    })
  );

  if (contentPaintDecision?.shouldPaint === false) {
    return;
  }

  const displayList = traceQuireViewPhase(
    options.trace,
    "svg-page-content-filter",
    () => ({
      ...displayListSource.displayList,
      bounds: frame.pageRect
    })
  );

  traceQuireViewPhase(options.trace, "svg-page-content-sync", () => {
    syncSvgContentDisplayListToSvg({
      host: frame.surface.content,
      displayList,
      viewportRect: frame.pageRect,
      ...(displayListSource.displayListIsViewportScoped === true
        ? { displayListIsViewportScoped: true }
        : {})
    });
  });

  if (contentPaintDecision !== undefined) {
    options.contentPaintCache?.commit(frame, contentPaintDecision);
  }
}

/**
 * Paints page-stack content frames after batching display-list filtering once.
 *
 * @param frames - Page frames to paint.
 * @param renderResult - Document-space render artifacts.
 * @param options - Optional content cache and trace sink.
 */
export function paintSvgPageStackFrameContents(
  frames: readonly QuirePageFrame<SvgPageStackFrameElements>[],
  renderResult: QuireViewRenderResult,
  options: PaintSvgPageFrameContentOptions = {}
): void {
  if (options.contentPaintCache === undefined) {
    paintSvgPageStackFrameContentsWithoutCache(frames, renderResult, options);
    return;
  }

  const work = resolveSvgPageStackContentPaintWork(frames, renderResult, options);

  for (const item of work) {
    if (item.pageDisplayList === undefined) {
      continue;
    }

    paintSvgPageFrameContent(item.frame, renderResult, {
      ...options,
      pageDisplayList: item.pageDisplayList,
      ...(item.decision === undefined ? {} : { contentPaintDecision: item.decision })
    });
  }
}

/** SVG content paint work resolved for one mounted page frame. */
interface SvgPageStackContentPaintWork {
  /** Frame whose content SVG may need synchronization. */
  readonly frame: QuirePageFrame<SvgPageStackFrameElements>;
  /** Page-local content display list, present only when synchronization is required. */
  readonly pageDisplayList?: QuireViewRenderResult["contentDisplayList"] | undefined;
  /** Pre-resolved paint decision to commit after successful synchronization. */
  readonly decision?: SvgPageStackContentPaintDecision | undefined;
}

/**
 * Paints every SVG page content frame without cache pre-resolution.
 *
 * @param frames - Page frames to paint.
 * @param renderResult - Document-space render artifacts.
 * @param options - Trace options forwarded to page content paint.
 */
function paintSvgPageStackFrameContentsWithoutCache(
  frames: readonly QuirePageFrame<SvgPageStackFrameElements>[],
  renderResult: QuireViewRenderResult,
  options: PaintSvgPageFrameContentOptions
): void {
  const pageDisplayLists = traceQuireViewPhase(
    options.trace,
    "svg-page-content-bucket",
    () => resolveQuirePageStackDisplayListsForFrames({
      frames,
      pageDisplayListChunks: requireSvgPageStackDisplayListChunks(renderResult),
      layer: "content"
    })
  );

  for (let index = 0; index < frames.length; index += 1) {
    paintSvgPageFrameContent(frames[index]!, renderResult, {
      ...options,
      pageDisplayList: pageDisplayLists[index]!
    });
  }
}

/**
 * Resolves cached SVG page content work before creating page-local lists.
 *
 * Cache hits use retained page-local chunks, so unchanged pages skip SVG
 * synchronization. Misses read the authoritative chunk for each page.
 *
 * @param frames - Mounted SVG page frames.
 * @param renderResult - Document-space render artifacts.
 * @param options - Paint cache and trace options.
 * @returns Paint work entries in frame order.
 */
function resolveSvgPageStackContentPaintWork(
  frames: readonly QuirePageFrame<SvgPageStackFrameElements>[],
  renderResult: QuireViewRenderResult,
  options: PaintSvgPageFrameContentOptions
): readonly SvgPageStackContentPaintWork[] {
  const paintCache = options.contentPaintCache;

  if (paintCache === undefined) {
    return [];
  }

  const work: SvgPageStackContentPaintWork[] = [];
  const missFrames: Array<QuirePageFrame<SvgPageStackFrameElements>> = [];
  const missWorkIndexes: number[] = [];
  const decisions = traceQuireViewPhase(
    options.trace,
    "svg-page-content-cache-resolve",
    () => paintCache.resolveBatch(frames.map((frame) => {
      const displayListSource = resolveQuirePageStackDisplayListSourceForFrame({
        frame,
        pageDisplayListChunks: requireSvgPageStackDisplayListChunks(renderResult),
        layer: "content"
      });

      return {
        frame,
        ...displayListSource,
        viewportRect: frame.pageRect,
      };
    }))
  );

  for (let index = 0; index < frames.length; index += 1) {
    const frame = frames[index]!;
    const decision = decisions[index]!;

    work.push({ frame, decision });

    if (decision.shouldPaint) {
      missFrames.push(frame);
      missWorkIndexes.push(index);
    }
  }

  if (missFrames.length === 0) {
    return work;
  }

  const missDisplayLists = traceQuireViewPhase(
    options.trace,
    "svg-page-content-bucket",
    () => resolveQuirePageStackDisplayListsForFrames({
      frames: missFrames,
      pageDisplayListChunks: requireSvgPageStackDisplayListChunks(renderResult),
      layer: "content"
    })
  );

  for (let index = 0; index < missWorkIndexes.length; index += 1) {
    const workIndex = missWorkIndexes[index]!;
    work[workIndex] = {
      ...work[workIndex]!,
      pageDisplayList: missDisplayLists[index]!
    };
  }

  return work;
}

/**
 * Paints page-stack overlays after batching display-list filtering once.
 *
 * @param frames - Page frames whose overlays should be synchronized.
 * @param renderResult - Document-space render artifacts.
 * @param caretVisible - Whether the blinking caret is currently visible.
 * @param options - Shared validity and optional trace sink.
 */
export function paintSvgPageStackFrameOverlays(
  frames: readonly QuirePageFrame<SvgPageStackFrameElements>[],
  renderResult: QuireViewRenderResult,
  caretVisible: boolean,
  options: PaintSvgPageStackFrameOverlaysOptions
): void {
  const pageDisplayLists = traceQuireViewPhase(
    options.trace,
    "svg-page-overlay-bucket",
    () => resolveQuirePageStackDisplayListsForFrames({
      frames,
      pageDisplayListChunks: requireSvgPageStackDisplayListChunks(renderResult),
      layer: "overlay"
    })
  );

  for (let index = 0; index < frames.length; index += 1) {
    paintSvgPageStackFrameOverlay(
      frames[index]!,
      pageDisplayLists[index]!,
      caretVisible,
      options
    );
  }
}

/**
 * Reads page-stack display-list chunks required by SVG page-stack synchronization.
 *
 * @param renderResult - Render result being synchronized into page-stack frames.
 * @returns Retained page-local display-list chunks.
 */
function requireSvgPageStackDisplayListChunks(
  renderResult: QuireViewRenderResult
): QuirePageStackDisplayListChunkIndex {
  const chunks = renderResult.pageDisplayListChunks;
  if (chunks === undefined) {
    throw new RangeError("SVG page-stack render requires pageDisplayListChunks.");
  }

  return chunks;
}

/**
 * Paints one page's overlay from an already page-scoped overlay display list.
 *
 * @param frame - Manager frame over svg page elements.
 * @param pageDisplayList - Overlay display list already scoped to `frame`.
 * @param caretVisible - Whether the blinking caret is currently visible.
 * @param options - Shared validity and optional trace sink.
 */
function paintSvgPageStackFrameOverlay(
  frame: QuirePageFrame<SvgPageStackFrameElements>,
  pageDisplayList: QuireViewRenderResult["overlayDisplayList"],
  caretVisible: boolean,
  options: PaintSvgPageStackFrameOverlaysOptions
): void {
  const displayList = traceQuireViewPhase(
    options.trace,
    "svg-page-overlay-build",
    () => createMountedPageOverlayDisplayList(
      pageDisplayList,
      frame.pageRect,
      caretVisible
    )
  );
  const signature = traceQuireViewPhase(
    options.trace,
    "svg-page-overlay-signature",
    () => createSvgPageStackOverlayPaintSignature(frame, displayList)
  );

  const decision = options.validity.resolve(frame.surface.overlay, signature);
  if (decision.action === "reuse") {
    return;
  }

  traceQuireViewPhase(options.trace, "svg-page-overlay-sync", () => {
    syncSvgDisplayListToSvg({
      host: frame.surface.overlay,
      displayList,
      viewportRect: frame.pageRect
    });
  });
  options.validity.commit(frame.surface.overlay, decision);
}

/**
 * Builds a paint signature for one page overlay SVG.
 *
 * @param frame - Mounted page frame whose overlay is being painted.
 * @param displayList - Page-filtered overlay display list.
 * @returns Stable signature for overlay pixels in this page frame.
 */
function createSvgPageStackOverlayPaintSignature(
  frame: QuirePageFrame<SvgPageStackFrameElements>,
  displayList: ReturnType<typeof createMountedPageOverlayDisplayList>
): string {
  return [
    `page:${frame.pageIndex}`,
    `rect:${createQuirePageStackRectPaintSignature(frame.pageRect)}`,
    `commands:${createQuirePageStackDisplayListPaintSignature(
      displayList,
      () => "none"
    )}`
  ].join("|");
}
