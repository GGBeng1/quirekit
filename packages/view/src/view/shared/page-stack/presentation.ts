import type { QuireRect } from "@quirekit/renderer";
import type { QuireLayoutPage } from "@quirekit/view-engine";
import type { MountedPaginatedSurfaceLifecycle } from "../lifecycle/types";
import type {
  PrepareQuirePageStackFillRenderOptions,
  QuirePageStackFillPresentationLifecycle,
  QuirePageStackFillRenderWindow
} from "./fill";
import type { QuirePageFrame } from "./types";

/** Shared pagination delegation; backend subclasses own only painting and measurement. */
export abstract class MountedPageStackPresentation<Surface> {
  /** Canonical viewport and sparse-frame lifecycle. */
  protected abstract readonly lifecycle: MountedPaginatedSurfaceLifecycle<Surface>;
  /** Viewport-first fill policy and scheduler. */
  protected abstract readonly fillLifecycle: QuirePageStackFillPresentationLifecycle;
  /** Clip coverage installed by the latest document render. */
  protected displayListClipRects: readonly QuireRect[] | undefined;

  /**
   * Resolves the bounded document window for one paginated render.
   *
   * @param options - Initial and focused-interaction document facts.
   * @returns Presentation-owned fill window consumed by layout compilation.
   */
  prepareFillRender(
    options: PrepareQuirePageStackFillRenderOptions
  ): QuirePageStackFillRenderWindow {
    return this.fillLifecycle.prepareRender(options);
  }

  /** Defers incomplete fill while focused interaction owns the next frame. */
  postponeFillForInteraction(): void {
    this.fillLifecycle.postponeForInteraction();
  }

  /** Resumes deferred fill after the focused interaction frame paints. */
  resumeFillAfterInteraction(): void {
    this.fillLifecycle.resumeAfterInteraction();
  }

  /**
   * Reads the visible document-space region.
   *
   * @returns Current visible document region.
   */
  getVisibleRegion(): QuireRect {
    return this.lifecycle.getVisibleRegion();
  }

  /**
   * Scrolls the viewport by a document-space distance.
   *
   * @param deltaY - Vertical distance in document coordinates; positive scrolls down.
   * @returns Whether the scroll source supports programmatic scrolling.
   */
  scrollByDocument(deltaY: number): boolean {
    return this.lifecycle.scrollByDocument(deltaY);
  }

  /**
   * Reports whether the current clip coverage holds every page visible at the current scroll position.
   *
   * @param pageRects - Page rectangles of the snapshot about to be installed.
   * @param bufferPages - Neighbouring-page buffer.
   * @returns Whether frames can be painted without another document render.
   */
  coversViewport(pageRects: readonly QuireRect[], bufferPages: number): boolean {
    return this.lifecycle.coversViewport(pageRects, bufferPages);
  }

  /**
   * Reads retained page rectangles.
   *
   * @returns Current page rectangles in document order.
   */
  getPageRects(): readonly QuireRect[] {
    return this.lifecycle.getPageRects();
  }

  /**
   * Resolves buffered visible pages for a retained page snapshot.
   *
   * @param pageRects - Page rectangles in document order.
   * @param bufferPages - Number of neighbouring pages to include.
   * @returns Ascending visible page indices.
   */
  resolveVisiblePageIndices(
    pageRects: readonly QuireRect[],
    bufferPages: number
  ): readonly number[] {
    return this.lifecycle.resolveVisiblePageIndices(pageRects, bufferPages);
  }

  /** Synchronizes sparse frames against the current scroll viewport. */
  syncViewport(): void {
    this.lifecycle.syncViewport();
  }

  /**
   * Installs clip coverage produced by the latest document render.
   *
   * @param clipRects - Document-space clip rectangles, or undefined for full coverage.
   */
  setDisplayListClipRects(clipRects: readonly QuireRect[] | undefined): void {
    this.displayListClipRects = clipRects;
  }

  /**
   * Replaces the retained page snapshot and synchronizes sparse frames.
   *
   * @param pages - Canonical layout pages in document order.
   * @param bufferPages - Number of neighbouring pages to mount.
   * @returns Every currently mounted page frame.
   */
  replacePages(
    pages: readonly QuireLayoutPage[],
    bufferPages: number
  ): readonly QuirePageFrame<Surface>[] {
    return this.lifecycle.replacePages({ pages, bufferPages }).frames;
  }

  /**
   * Reads every mounted page frame.
   *
   * @returns Mounted frames in page order.
   */
  getFrames(): readonly QuirePageFrame<Surface>[] {
    return this.lifecycle.getFrames();
  }
}
