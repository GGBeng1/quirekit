import { MountedPageStackPresentation } from "../../shared/page-stack/presentation";
import type {
  QuireHitTestResult
} from "@quirekit/view-engine";
import type { QuireViewRenderResult } from "../../types";
import {
  createAncestorScrollSource,
  createMountedPaginatedSurfaceLifecycle,
  findScrollableAncestor,
  resolveMountedCaretOmitsOverlayCaret,
  shouldRefreshQuirePageStackDisplayListClip,
  QuirePageSurfacePaintValidityCache,
  type MountedPaginatedSurfaceLifecycle,
  type QuirePageFrame,
  type QuirePageStackFillPresentationLifecycle,
  type QuireViewCoordsAtPosResult
} from "../../shared";
import {
  createSvgBrowserMeasuredRenderResult,
  createSvgGeometryProvider,
  type SvgGeometryProvider,
  type SvgGeometryProviderCoordsAtPosOptions,
  type SvgGeometryProviderHitTestOptions
} from "../browser-geometry";
import {
  createSvgPageSurfaceAdapter,
  paintSvgPageStackFrameContents,
  paintSvgPageStackFrameOverlays
} from "./adapter";
import { createSvgPageStackContentPaintCache } from "./content-paint-cache";
import { createSvgPageStackFillLifecycle } from "./fill";
import type { SvgPageStackFrameElements } from "./frames";
import type {
  CreateSvgPageStackPresentationOptions,
  SvgPageStackPresentationPaintOptions
} from "./types";

/** Owns sparse SVG frames, content reuse, and browser-measured frame geometry. */
export class SvgPageStackPresentation extends MountedPageStackPresentation<SvgPageStackFrameElements> {
  /** Canonical viewport and sparse-frame lifecycle. */
  protected readonly lifecycle: MountedPaginatedSurfaceLifecycle<SvgPageStackFrameElements>;
  /** Viewport-first fill policy and scheduler owned by this presentation. */
  protected readonly fillLifecycle: QuirePageStackFillPresentationLifecycle;
  /** Persistent page-content synchronization cache. */
  private readonly contentPaintCache = createSvgPageStackContentPaintCache();
  /** Live overlay signatures shared with other mounted page-surface caches. */
  private readonly overlayPaintValidity =
    new QuirePageSurfacePaintValidityCache<SVGSVGElement>();
  /** Browser measurements bound to the currently mounted frame set. */
  private geometryProvider: SvgGeometryProvider | undefined;
  /** Whether reverse-order presentation teardown has started. */
  private destroyed = false;

  /**
   * Creates one SVG page-stack presentation resource.
   *
   * @param options - Mounted surfaces, runtime policies, and render callbacks.
   */
  constructor(private readonly options: CreateSvgPageStackPresentationOptions) {
    super();
    const scroller = findScrollableAncestor(options.documentSurface)
      ?? (options.documentSurface.ownerDocument.defaultView
        ?? options.documentSurface) as HTMLElement | Window;

    this.lifecycle = createMountedPaginatedSurfaceLifecycle({
      scrollSource: createAncestorScrollSource({
        scroller,
        content: options.documentSurface
      }),
      host: options.host,
      ownerDocument: options.root.ownerDocument,
      adapter: createSvgPageSurfaceAdapter(),
      readBufferPages: () => 1,
      readGeometryEpoch: () => 0,
      shouldRequestDocumentRefresh: ({ pageRects, visiblePageIndices }) =>
        shouldRefreshQuirePageStackDisplayListClip({
          pageRects,
          visiblePageIndices,
          clipRects: this.displayListClipRects
        }),
      requestDocumentRefresh: options.requestDocumentRefresh,
      realizeViewport: ({ frames, realizedFrames }) => {
        const state = options.readRenderState();

        if (realizedFrames.length === 0 || state === null) {
          return;
        }

        paintSvgPageStackFrameContents(realizedFrames, state.renderResult, {
          contentPaintCache: this.contentPaintCache
        });

        const measuredRenderResult = this.measureFrames(
          frames,
          state.renderResult
        );
        options.commitRenderResult(measuredRenderResult);
        paintSvgPageStackFrameOverlays(
          realizedFrames,
          measuredRenderResult,
          state.caretVisible,
          { validity: this.overlayPaintValidity }
        );
        this.lifecycle.markPainted(realizedFrames);
      },
      onVisiblePagesChange: (visiblePageIndices) => {
        options.runtime?.onVisiblePagesChange?.(visiblePageIndices);
      }
    });
    this.fillLifecycle = createSvgPageStackFillLifecycle({
      root: options.root,
      runtime: options.runtime,
      fill: options.fill,
      readVisibleHeight: () => this.lifecycle.getVisibleRegion().height,
      syncViewport: () => {
        this.lifecycle.syncViewport(0);
      },
      isAvailable: () => !this.destroyed
    });
  }

  /**
   * Paints all mounted SVG content, rebuilds measured geometry, and paints overlays.
   *
   * @param renderResult - Authoritative document-space render products.
   * @param options - Caret, IME preservation, and trace policies.
   * @returns Browser-measured render result bound to the mounted frame set.
   */
  paintAndMeasure(
    renderResult: QuireViewRenderResult,
    options: SvgPageStackPresentationPaintOptions
  ): QuireViewRenderResult {
    const frames = this.lifecycle.getFrames();

    paintSvgPageStackFrameContents(frames, renderResult, {
      contentPaintCache: this.contentPaintCache,
      ...(options.trace === undefined ? {} : { trace: options.trace })
    });

    const measuredRenderResult = this.measureFrames(
      frames,
      renderResult,
      options,
      true
    );
    paintSvgPageStackFrameOverlays(
      frames,
      measuredRenderResult,
      options.caretVisible,
      {
        validity: this.overlayPaintValidity,
        ...(options.trace === undefined ? {} : { trace: options.trace })
      }
    );

    this.lifecycle.markPainted(frames);
    return measuredRenderResult;
  }

  /**
   * Rebuilds selection products against the retained browser measurements.
   *
   * @param renderResult - Selection-updated retained render products.
   * @returns Browser-measured selection result, or the input before first paint.
   */
  measureSelection(renderResult: QuireViewRenderResult): QuireViewRenderResult {
    if (this.geometryProvider === undefined) {
      return renderResult;
    }

    return createSvgBrowserMeasuredRenderResult({
      renderResult,
      textRoots: this.lifecycle.getFrames().map((frame) => frame.surface.content),
      geometryProvider: this.geometryProvider,
      ...(this.options.runtime?.displayListStyles === undefined
        ? {}
        : { styles: this.options.runtime.displayListStyles }),
      ...(this.options.runtime?.surfaceConfig === undefined
        ? {}
        : { surfaceConfig: this.options.runtime.surfaceConfig }),
      omitCaretCommands: this.omitCaretCommands()
    });
  }

  /**
   * Hit-tests against browser-measured SVG text.
   *
   * @param options - Retained and browser coordinate facts.
   * @returns Refined SVG hit, or null before measurements exist.
   */
  hitTest(options: SvgGeometryProviderHitTestOptions): QuireHitTestResult | null {
    return this.geometryProvider?.hitTest(options) ?? null;
  }

  /**
   * Refines retained position coordinates against browser-measured SVG text.
   *
   * @param options - Position, retained rectangle, and projection facts.
   * @returns Refined client rectangle, or null before measurements exist.
   */
  refineCoordsAtPos(
    options: SvgGeometryProviderCoordsAtPosOptions
  ): QuireViewCoordsAtPosResult | null {
    return this.geometryProvider?.refineCoordsAtPos(options) ?? null;
  }

  /**
   * Repaints transient overlays while retaining SVG page content.
   *
   * @param renderResult - Current render products.
   * @param caretVisible - Whether caret commands should remain visible.
   */
  repaintOverlays(
    renderResult: QuireViewRenderResult,
    caretVisible: boolean
  ): void {
    paintSvgPageStackFrameOverlays(
      this.lifecycle.getFrames(),
      renderResult,
      caretVisible,
      { validity: this.overlayPaintValidity }
    );
  }

  /**
   * Repaints transient drawing content and chrome without replacing geometry authority.
   *
   * @param renderResult - Transient page-local render products.
   * @param caretVisible - Whether caret commands should remain visible.
   */
  repaintDrawingPreview(
    renderResult: QuireViewRenderResult,
    caretVisible: boolean
  ): void {
    // Speculative reflow may add/remove pages; cancellation restores the accepted set.
    const frames = this.replacePages(renderResult.layoutSnapshot.pages ?? [], 1);
    paintSvgPageStackFrameContents(frames, renderResult);
    this.repaintOverlays(renderResult, caretVisible);
    this.lifecycle.markPainted(frames);
  }

  /** Releases viewport subscriptions and sparse SVG page frames. */
  destroy(): void {
    if (this.destroyed) {
      return;
    }

    this.destroyed = true;
    this.fillLifecycle.destroy();
    this.lifecycle.destroy();
    this.contentPaintCache.destroy();
    this.overlayPaintValidity.reset();
    this.geometryProvider = undefined;
  }

  /**
   * Rebuilds browser geometry for one authoritative mounted frame set.
   *
   * @param frames - Every mounted SVG page frame.
   * @param renderResult - Render products already painted into the frames.
   * @param options - Optional IME preservation and trace policy.
   * @param runBrowserMeasureProbe - Whether the full-paint diagnostics probe should run.
   * @returns Browser-measured render result.
   */
  private measureFrames(
    frames: readonly QuirePageFrame<SvgPageStackFrameElements>[],
    renderResult: QuireViewRenderResult,
    options: Partial<SvgPageStackPresentationPaintOptions> = {},
    runBrowserMeasureProbe = false
  ): QuireViewRenderResult {
    const textRoots = frames.map((frame) => frame.surface.content);
    const geometryProvider = createSvgGeometryProvider({
      renderResult,
      textRoots,
      ...(options.trace === undefined ? {} : { trace: options.trace })
    });
    this.geometryProvider = geometryProvider;

    return createSvgBrowserMeasuredRenderResult({
      renderResult,
      textRoots,
      geometryProvider,
      ...(options.trace === undefined ? {} : { trace: options.trace }),
      ...(options.preserveSelectionGeometry === undefined
        ? {}
        : { preserveSelectionGeometry: options.preserveSelectionGeometry }),
      ...(!runBrowserMeasureProbe
        || this.options.runtime?.browserMeasureProbe === undefined
        ? {}
        : { browserMeasureProbe: this.options.runtime.browserMeasureProbe }),
      ...(this.options.runtime?.displayListStyles === undefined
        ? {}
        : { styles: this.options.runtime.displayListStyles }),
      ...(this.options.runtime?.surfaceConfig === undefined
        ? {}
        : { surfaceConfig: this.options.runtime.surfaceConfig }),
      omitCaretCommands: this.omitCaretCommands()
    });
  }

  /**
   * Resolves whether DOM caret mode removes caret commands from SVG overlays.
   *
   * @returns Whether overlay caret commands must be omitted.
   */
  private omitCaretCommands(): boolean {
    return resolveMountedCaretOmitsOverlayCaret(
      this.options.runtime?.caretRendering
    );
  }
}

/**
 * Creates one mounted SVG page-stack presentation resource.
 *
 * @param options - Mounted surfaces, runtime policies, and render callbacks.
 * @returns Owned SVG page-stack presentation resource.
 */
export function createSvgPageStackPresentation(
  options: CreateSvgPageStackPresentationOptions
): SvgPageStackPresentation {
  return new SvgPageStackPresentation(options);
}
