import {
  renderCanvasDisplayList,
  type Canvas2DRenderTarget,
  type QuireDisplayList,
  type QuireRect
} from "@quirekit/renderer";
import {
  createMountedPageOverlayDisplayList,
  resolveQuirePageStackDisplayListSourceForFrame,
  resolveQuirePageStackDisplayListsForFrames,
  type QuirePageStackDisplayListChunkIndex
} from "../../shared";
import type { QuireViewRenderOptions, QuireViewRenderResult } from "../../types";
import { resolveCanvasSurfaceTarget } from "../surface";
import type {
  CanvasPageStackContentPaintCache,
  CanvasPageStackContentPaintDecision
} from "./content-paint";
import type { CanvasPageStackFrame } from "./frames";
import { paintCanvasPageStackOverlay } from "./overlay-tiles";
import type {
  CanvasPageStackOverlayPaintCache,
  CanvasPageStackOverlayPaintDecision
} from "./overlay-paint-cache";

export { createCanvasPageStackContentPaintCache } from "./content-paint";
export { createCanvasPageStackOverlayPaintCache } from "./overlay-paint-cache";
export type { CanvasPageStackContentPaintCache } from "./content-paint";
export type { CanvasPageStackOverlayPaintCache } from "./overlay-paint-cache";

/** Inputs for painting a render result across page-stack frames. */
export interface RenderCanvasPageStackOptions {
  /** Frames to paint, one per page. */
  readonly frames: readonly CanvasPageStackFrame[];
  /** Render artifacts (document-space display list) to paint per page. */
  readonly renderResult: QuireViewRenderResult;
  /** Device pixel ratio applied to each page's backing store. */
  readonly devicePixelRatio: number;
  /** Optional glyph-run painter forwarded to the display-list painter. */
  readonly glyphRunPainter?: QuireViewRenderOptions["glyphRunPainter"];
  /** Optional cache that skips repainting unchanged page content canvases. */
  readonly contentPaintCache?: CanvasPageStackContentPaintCache | undefined;
  /** Optional cache that skips repainting unchanged page overlay canvases. */
  readonly overlayPaintCache?: CanvasPageStackOverlayPaintCache | undefined;
}

/** Inputs for repainting transient content across mounted page-stack frames. */
export interface RepaintCanvasPageStackContentsOptions {
  /** Frames whose content surfaces should repaint. */
  readonly frames: readonly CanvasPageStackFrame[];
  /** Transient render result carrying page-local content chunks. */
  readonly renderResult: QuireViewRenderResult;
  /** Device pixel ratio applied to page backing stores. */
  readonly devicePixelRatio: number;
  /** Optional glyph-run painter forwarded to the display-list painter. */
  readonly glyphRunPainter?: QuireViewRenderOptions["glyphRunPainter"];
}

/** Content paint work resolved for one mounted page-stack frame. */
interface CanvasPageStackContentPaintWork {
  /** Frame whose content surface may need repainting. */
  readonly frame: CanvasPageStackFrame;
  /** Page-filtered display list, present only when content repaint is required. */
  readonly displayList?: QuireDisplayList | undefined;
  /** Paint cache decision to commit after a successful repaint. */
  readonly decision?: CanvasPageStackContentPaintDecision | undefined;
}

/** Overlay paint work resolved for one mounted page-stack frame. */
interface CanvasPageStackOverlayPaintWork {
  /** Frame whose overlay surface may need repainting. */
  readonly frame: CanvasPageStackFrame;
  /** Page-filtered overlay display list, present only when overlay repaint is required. */
  readonly displayList?: QuireDisplayList | undefined;
  /** Paint cache decision to commit after a successful repaint. */
  readonly decision?: CanvasPageStackOverlayPaintDecision | undefined;
}

/**
 * Paints one document-space render result across the page-stack frames.
 *
 * The display list is built once in document space; each frame paints it through a
 * per-page transform that maps document coordinates into that page's local space
 * (`translate(-pageRect.x, -pageRect.y)` after the DPR scale), clearing only the
 * page's bounds. Content outside the page lands beyond the canvas and is clipped by
 * its bounds, so each canvas shows exactly its page and the gaps stay empty.
 *
 * @param options - Frames, render result, device pixel ratio, and glyph painter.
 */
export function renderCanvasPageStack(options: RenderCanvasPageStackOptions): void {
  const pageDisplayListChunks = requireCanvasPageStackDisplayListChunks(
    options.renderResult
  );
  const contentPaintWork = resolveCanvasPageStackContentPaintWork(options);
  const overlayPaintWork = resolveCanvasPageStackOverlayPaintWork({
    frames: options.frames,
    pageDisplayListChunks,
    devicePixelRatio: options.devicePixelRatio,
    ...(options.overlayPaintCache === undefined
      ? {}
      : { overlayPaintCache: options.overlayPaintCache }),
    ...(options.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: options.glyphRunPainter })
  });

  for (let index = 0; index < options.frames.length; index += 1) {
    const frame = options.frames[index]!;
    const contentTarget = resolveCanvasSurfaceTarget(frame.content);

    if (!contentTarget) {
      continue;
    }

    const work = contentPaintWork[index]!;
    const contentDisplayList = work.displayList;
    const restoredFromBitmap = (
      work.decision?.action === "restore"
      && options.contentPaintCache?.restore(frame, work.decision)
    ) === true;

    // Bitmap restore synchronizes only persistent content. The overlay lane
    // below remains live and is resolved from the current retained chunks.
    if (!restoredFromBitmap && contentDisplayList !== undefined) {
      applyCanvasPageStackTransform(contentTarget, frame.pageRect, options.devicePixelRatio);
      renderCanvasDisplayList({
        displayList: contentDisplayList,
        target: contentTarget,
        ...(options.glyphRunPainter === undefined
          ? {}
          : { glyphRunPainter: options.glyphRunPainter })
      });

      if (work.decision !== undefined) {
        options.contentPaintCache?.commitPaint(frame, work.decision);
      }
    }

    const overlayWork = overlayPaintWork[index]!;
    const overlayDisplayList = overlayWork.displayList;

    if (overlayDisplayList !== undefined) {
      paintCanvasPageStackOverlay(frame, overlayDisplayList, options.devicePixelRatio, options.glyphRunPainter);
      if (overlayWork.decision !== undefined) {
        options.overlayPaintCache?.commit(frame, overlayWork.decision);
      }
    }
  }
}

/**
 * Repaints mounted page content from transient chunks without mutating caches.
 *
 * @param options - Frames, transient result, DPR, and optional glyph painter.
 */
export function repaintCanvasPageStackContents(
  options: RepaintCanvasPageStackContentsOptions
): void {
  const displayLists = resolveQuirePageStackDisplayListsForFrames({
    frames: options.frames,
    pageDisplayListChunks: requireCanvasPageStackDisplayListChunks(
      options.renderResult
    ),
    layer: "content"
  });

  for (let index = 0; index < options.frames.length; index += 1) {
    const frame = options.frames[index]!;
    const target = resolveCanvasSurfaceTarget(frame.content);
    if (!target) {
      continue;
    }

    applyCanvasPageStackTransform(target, frame.pageRect, options.devicePixelRatio);
    renderCanvasDisplayList({
      displayList: withCanvasPageStackPaintBounds(
        displayLists[index]!,
        frame.pageRect
      ),
      target,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    });
  }
}

/**
 * Resolves which page content surfaces need page-local display lists.
 *
 * The content paint cache signs retained page-local chunks. Cache hits skip
 * repainting; misses read the authoritative chunk for each page.
 *
 * @param options - Page-stack render request.
 * @returns Paint work entries in frame order.
 */
function resolveCanvasPageStackContentPaintWork(
  options: RenderCanvasPageStackOptions
): readonly CanvasPageStackContentPaintWork[] {
  const paintCache = options.contentPaintCache;

  if (paintCache === undefined) {
    const displayLists = resolveQuirePageStackDisplayListsForFrames({
      frames: options.frames,
      pageDisplayListChunks: requireCanvasPageStackDisplayListChunks(
        options.renderResult
      ),
      layer: "content"
    });

    return options.frames.map((frame, index) => ({
      frame,
      displayList: withCanvasPageStackPaintBounds(displayLists[index]!, frame.pageRect)
    }));
  }

  const sources = options.frames.map((frame) => {
    const displayListSource = resolveQuirePageStackDisplayListSourceForFrame({
      frame,
      pageDisplayListChunks: requireCanvasPageStackDisplayListChunks(
        options.renderResult
      ),
      layer: "content"
    });

    return {
      frame,
      ...displayListSource,
      viewportRect: frame.pageRect,
      devicePixelRatio: options.devicePixelRatio,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    };
  });
  const decisions = paintCache.resolveBatch(sources);

  return options.frames.map((frame, index) => {
    const decision = decisions[index]!;
    if (decision.action === "skip") {
      return { frame, decision };
    }
    return {
      frame,
      decision,
      displayList: withCanvasPageStackPaintBounds(
        sources[index]!.displayList,
        frame.pageRect
      )
    };
  });
}

/** Inputs for resolving page-stack overlay paint work. */
interface ResolveCanvasPageStackOverlayPaintWorkOptions {
  /** Frames whose overlay canvases may be repainted. */
  readonly frames: readonly CanvasPageStackFrame[];
  /** Page-local chunks attached to the current render result. */
  readonly pageDisplayListChunks: QuirePageStackDisplayListChunkIndex;
  /** Device pixel ratio applied to each page's overlay. */
  readonly devicePixelRatio: number;
  /** Optional glyph-run painter forwarded to the display-list painter. */
  readonly glyphRunPainter?: QuireViewRenderOptions["glyphRunPainter"];
  /** Optional cache that skips unchanged overlay canvases. */
  readonly overlayPaintCache?: CanvasPageStackOverlayPaintCache | undefined;
  /** Whether the overlay list should be filtered by caret visibility. */
  readonly caretVisible?: boolean | undefined;
}

/**
 * Resolves which page overlay surfaces need repainting.
 *
 * The overlay cache signs the exact page-scoped overlay display list that would
 * be painted, after optional caret filtering. Pages without caret commands stay
 * cache hits when the caret blink toggles on a different page.
 *
 * @param options - Page-stack overlay render request.
 * @returns Overlay paint work entries in frame order.
 */
function resolveCanvasPageStackOverlayPaintWork(
  options: ResolveCanvasPageStackOverlayPaintWorkOptions
): readonly CanvasPageStackOverlayPaintWork[] {
  const overlayDisplayLists = resolveQuirePageStackDisplayListsForFrames({
    frames: options.frames,
    pageDisplayListChunks: options.pageDisplayListChunks,
    layer: "overlay"
  });

  return options.frames.map((frame, index) => {
    const displayList = options.caretVisible === undefined
      ? withCanvasPageStackPaintBounds(overlayDisplayLists[index]!, frame.pageRect)
      : createMountedPageOverlayDisplayList(
          overlayDisplayLists[index]!,
          frame.pageRect,
          options.caretVisible
        );

    if (options.overlayPaintCache === undefined) {
      return { frame, displayList };
    }

    const decision = options.overlayPaintCache.resolve({
      frame,
      displayList,
      devicePixelRatio: options.devicePixelRatio,
      ...(options.glyphRunPainter === undefined
        ? {}
        : { glyphRunPainter: options.glyphRunPainter })
    });

    if (!decision.shouldPaint) {
      return { frame, decision };
    }

    return { frame, displayList, decision };
  });
}

/** Inputs for repainting page-stack overlays with a caret-visibility toggle. */
export interface RepaintCanvasPageStackOverlaysOptions {
  /** Frames whose overlays should be repainted. */
  readonly frames: readonly CanvasPageStackFrame[];
  /** Device pixel ratio applied to each page's overlay. */
  readonly devicePixelRatio: number;
  /** Whether the blinking caret is currently visible. */
  readonly caretVisible: boolean;
  /** Optional glyph-run painter forwarded to the display-list painter. */
  readonly glyphRunPainter?: QuireViewRenderOptions["glyphRunPainter"];
  /** Optional cache that skips repainting unchanged page overlay canvases. */
  readonly overlayPaintCache?: CanvasPageStackOverlayPaintCache | undefined;
  /** Page-local chunks attached to the current render result. */
  readonly pageDisplayListChunks: QuirePageStackDisplayListChunkIndex;
}

/**
 * Repaints each page's overlay surface with the current caret visibility.
 *
 * Used by the caret blink in page-stack mode, where the caret lives on the
 * per-page overlay canvases rather than a single overlay surface.
 *
 * @param options - Frames, overlay display list, DPR, and caret visibility.
 */
export function repaintCanvasPageStackOverlays(
  options: RepaintCanvasPageStackOverlaysOptions
): void {
  const overlayPaintWork = resolveCanvasPageStackOverlayPaintWork({
    frames: options.frames,
    pageDisplayListChunks: options.pageDisplayListChunks,
    devicePixelRatio: options.devicePixelRatio,
    caretVisible: options.caretVisible,
    ...(options.overlayPaintCache === undefined
      ? {}
      : { overlayPaintCache: options.overlayPaintCache }),
    ...(options.glyphRunPainter === undefined
      ? {}
      : { glyphRunPainter: options.glyphRunPainter })
  });

  for (let index = 0; index < options.frames.length; index += 1) {
    const frame = options.frames[index]!;
    const work = overlayPaintWork[index]!;
    const displayList = work.displayList;

    if (displayList === undefined) {
      continue;
    }

    paintCanvasPageStackOverlay(frame, displayList, options.devicePixelRatio, options.glyphRunPainter);
    if (work.decision !== undefined) {
      options.overlayPaintCache?.commit(frame, work.decision);
    }
  }
}

/**
 * Reads page-stack display-list chunks required by page-stack painting.
 *
 * @param renderResult - Render result being painted into page-stack frames.
 * @returns Retained page-local display-list chunks.
 */
function requireCanvasPageStackDisplayListChunks(
  renderResult: QuireViewRenderResult
): QuirePageStackDisplayListChunkIndex {
  const chunks = renderResult.pageDisplayListChunks;
  if (chunks === undefined) {
    throw new RangeError("Canvas page-stack render requires pageDisplayListChunks.");
  }

  return chunks;
}

/**
 * Applies page-local clear bounds to a page-filtered display list.
 *
 * @param displayList - Display list whose commands are already scoped to a page.
 * @param bounds - Page rectangle used for clearing the target before painting.
 * @returns Display list with page clear bounds.
 */
function withCanvasPageStackPaintBounds(
  displayList: QuireDisplayList,
  bounds: QuireRect
): QuireDisplayList {
  return {
    ...displayList,
    bounds
  };
}

/**
 * Sets a page's render transform: DPR scale plus a page-local translation.
 *
 * @param target - Canvas 2D target for the page.
 * @param pageRect - Page rectangle in document space.
 * @param devicePixelRatio - Device pixel ratio for the backing store.
 */
function applyCanvasPageStackTransform(
  target: Canvas2DRenderTarget,
  pageRect: QuireRect,
  devicePixelRatio: number
): void {
  const context = target as CanvasRenderingContext2D;

  if (typeof context.setTransform === "function") {
    context.setTransform(
      devicePixelRatio,
      0,
      0,
      devicePixelRatio,
      -pageRect.x * devicePixelRatio,
      -pageRect.y * devicePixelRatio
    );
  }
}
