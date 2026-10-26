import { containsQuirePoint, type QuireRect } from "@quirekit/renderer";
import type { ClassicEditorZoomMode } from "../../types";
import type { ClassicEditorShellRegions } from "../types";
import { calculateResponsiveRailWidth, calculateResponsiveStageWidth, projectResponsiveScrollLeft } from "./geometry";
import { calculateFitRailWidth, calculateFitZoom, findReadingPage, findReadingStagePage, calculateContentFitZoom } from "./fit";
import { containsClassicEditorPagePoint, readClassicEditorPageRect } from "./page-hit";
import { createClassicEditorHeaderProjection } from "./header";
import type { ClassicEditorFitZoomListener, ClassicEditorStageController, ClassicEditorStagePage } from "./types";

/**
 * Stages a canonical document independently of its viewport reading scale.
 * @param elements - Stable shell regions; geometry arrives from the public View render callback.
 * @param onFitZoom - Publishes effective percentages without issuing document commands.
 * @returns Controller released with the shell.
 */
export function createClassicEditorStageController(elements: ClassicEditorShellRegions, onFitZoom: ClassicEditorFitZoomListener): ClassicEditorStageController {
  const viewport = elements.workspaceViewport;
  const header = createClassicEditorHeaderProjection(elements);
  let bounds: QuireRect | undefined;
  let frame = 0;
  let scale = 1;
  let requestedScale = 1;
  let overflow = 0;
  let horizontalOffset = 0;
  let scrollLeft = 0;
  let center = 0;
  let paperStart = 0;
  let mode: ClassicEditorZoomMode = "manual";
  let appliedMode: ClassicEditorZoomMode = "manual";
  let pages: readonly ClassicEditorStagePage[] | undefined;
  let measuredPages: readonly ClassicEditorStagePage[] | undefined;
  let paperHeight = 0;
  let viewportWidth = 0;
  let viewportHeight = 0;
  let destroyed = false;
  let anchor: { x: number; y: number; documentX: number; documentY: number } | undefined;
  /** @returns Body geometry of the current reading page, or paper geometry for generic profiles. */
  function readingBody(): QuireRect | undefined {
    const page = findReadingStagePage(pages ?? [], (viewport.scrollTop + viewport.clientHeight / 2) / scale);
    return page?.bodyRect ?? page?.pageRect;
  }

  /** Captures only deliberate scrolling against an already reconciled width. */
  function captureScroll(): void {
    const current = Math.max(0, viewport.scrollWidth - viewport.clientWidth);
    if (current > 0 && Math.abs(current - overflow) <= 1) scrollLeft = viewport.scrollLeft + horizontalOffset;
    header.sync();
  }

  /** Reads canonical and client geometry before writing the scaled stage. */
  function sync(): void {
    frame = 0;
    if (destroyed || !bounds) return;
    captureScroll();
    const readingY = (viewport.scrollTop + viewport.clientHeight / 2) / scale;
    const width = Math.max(1, bounds.x + bounds.width);
    const resized = viewportWidth !== viewport.clientWidth || viewportHeight !== viewport.clientHeight;
    viewportWidth = viewport.clientWidth;
    viewportHeight = viewport.clientHeight;
    // Automatic modes consume only public paper geometry. Each new page table
    // is reduced once; same-table updates reuse it and width-fit never scans it.
    if (mode === "fit-page" && measuredPages !== pages) {
      measuredPages = pages;
      paperHeight = pages?.reduce((height, page) => Math.max(height, page.pageRect.height), 0) ?? 0;
    }
    const automaticMode = mode === "manual" ? undefined : mode;
    const automatic = automaticMode !== undefined;
    const compact = elements.root?.dataset.layout === "compact";
    const sidebar = compact ? 0 : automatic
      ? calculateFitRailWidth(viewportWidth, !elements.documentSidebar.hidden)
      : elements.documentSidebar.hidden ? 0 : calculateResponsiveRailWidth(width * requestedScale, viewportWidth);
    const body = mode === "fit-content" ? readingBody() : undefined;
    const fitted = mode === "fit-content" ? calculateContentFitZoom(body, viewportWidth - sidebar)
      : automaticMode && automaticMode !== "fit-content" ? calculateFitZoom(automaticMode, width, paperHeight, viewportWidth, viewportHeight, sidebar) : undefined;
    const nextScale = fitted === undefined ? requestedScale : fitted / 100;
    const changed = nextScale !== scale;
    const page = mode === "fit-page" && fitted !== undefined && (changed || resized || appliedMode !== mode)
      ? findReadingPage(pages ?? [], readingY) : undefined;
    // Body-fit crops real paper margins. Lock native panning in the same stage
    // commit that centers them; a clamped, still-wide body must remain reachable.
    const scrollAxis = compact && body && fitted !== undefined && body.width * nextScale <= viewportWidth ? "y" : "both";
    if (viewport.dataset.scrollAxis !== scrollAxis) viewport.dataset.scrollAxis = scrollAxis;
    if (sidebar > 0) elements.documentScrollContent.style.setProperty("--qk-classic-right-sidebar-width", `${sidebar}px`);
    else elements.documentScrollContent.style.removeProperty("--qk-classic-right-sidebar-width");
    // Manual reading centers the paper; the companion extends only the trailing
    // scroll range. Explicit fit modes reserve both columns inside the viewport.
    const availableWidth = viewportWidth - (automatic ? sidebar : 0);
    const stageWidth = calculateResponsiveStageWidth(width * nextScale, availableWidth);
    const stageStart = Math.max(0, (availableWidth - stageWidth) / 2);
    const nextPaperStart = stageStart + (stageWidth - width * nextScale) / 2;
    const nextCenter = Math.max(0, (stageWidth - availableWidth) / 2);
    const fittedLeft = body && fitted !== undefined
      ? Math.max(0, nextPaperStart + body.x * nextScale - (viewportWidth - body.width * nextScale) / 2)
      : undefined;
    const nextOffset = scrollAxis === "y" ? fittedLeft! : 0;
    // The fixed-height header projects the same rail origin and native scroll
    // offset as the cards, including when the column is outside the viewport.
    elements.workspaceToolbar.style.setProperty("--qk-classic-companion-width", `${sidebar}px`);
    elements.workspaceToolbar.style.setProperty("--qk-classic-companion-start", `${stageStart + stageWidth}px`);
    elements.documentScrollContent.style.setProperty("--qk-classic-view-width", `${width}px`);
    elements.documentScrollContent.style.setProperty("--qk-classic-stage-width", `${stageWidth}px`);
    elements.documentScrollContent.style.setProperty("--qk-classic-stage-start", `${stageStart}px`);
    elements.canvasMount.style.setProperty("zoom", String(nextScale));
    elements.canvasMount.style.setProperty("--qk-classic-reading-scale", String(nextScale));
    // Clipping removes native horizontal travel, not canonical paper geometry.
    // The mount offset uses pre-zoom pixels; anchors and reading progress use client pixels.
    elements.canvasMount.style.setProperty("--qk-classic-body-offset", `${-nextOffset / nextScale}px`);
    // Overlay geometry may settle later than the columns after resize. Its
    // transient overflow must not change the horizontal reading range.
    const nextOverflow = Math.max(0, stageStart + stageWidth + sidebar - viewportWidth);
    viewport.scrollLeft = scrollAxis === "y" ? 0 : fittedLeft !== undefined ? fittedLeft
      : anchor ? Math.max(0, nextPaperStart + anchor.documentX * nextScale - anchor.x)
      : projectResponsiveScrollLeft(scrollLeft, overflow, nextOverflow, center, nextCenter);
    if (anchor) viewport.scrollTop = Math.max(0, anchor.documentY * nextScale - anchor.y);
    else if (page || changed) viewport.scrollTop = Math.max(0, (page ? page.y + page.height / 2 : readingY) * nextScale - viewportHeight / 2);
    anchor = undefined;
    overflow = nextOverflow;
    horizontalOffset = nextOffset;
    paperStart = nextPaperStart;
    center = nextCenter;
    scale = nextScale;
    appliedMode = mode;
    scrollLeft = viewport.scrollLeft + horizontalOffset;
    header.sync();
    if (changed) viewport.dispatchEvent(new Event("scroll"));
    if (automaticMode && fitted !== undefined && fitted !== Math.round(requestedScale * 100)) onFitZoom(fitted, automaticMode);
  }

  /** Batches bounds, UI and resize changes without scheduling one job per input event. */
  function schedule(): void {
    if (!destroyed && !frame) frame = requestAnimationFrame(sync);
  }

  const observer = new ResizeObserver(schedule);
  observer.observe(viewport);
  viewport.addEventListener("scroll", captureScroll, { passive: true });
  return {
    /** @param clientY - Selected caret ordinate. @returns Retained physical sheet in client pixels. */
    readPageRect(clientY) {
      return destroyed ? undefined : readClassicEditorPageRect(pages, bounds, elements.canvasMount, clientY);
    },
    /**
     * @param clientX - Horizontal pointer coordinate in client CSS pixels.
     * @param clientY - Vertical pointer coordinate in client CSS pixels.
     * @returns Whether the visible workspace point belongs to document paper.
     */
    containsPagePoint(clientX, clientY) {
      if (destroyed || !bounds) return false;
      const clip = viewport.getBoundingClientRect();
      if (clientX < clip.left || clientX >= clip.right || clientY < clip.top || clientY >= clip.bottom) return false;
      // The stage owns uniform reading zoom; its actual client origin includes
      // native scrolling, centering and compact-mode margin cropping.
      const rect = elements.canvasMount.getBoundingClientRect();
      const actualScale = rect.width / (bounds.x + bounds.width);
      if (!(actualScale > 0)) return false;
      const point = { x: (clientX - rect.left) / actualScale, y: (clientY - rect.top) / actualScale };
      return pages === undefined ? containsQuirePoint(bounds, point) : containsClassicEditorPagePoint(pages, point);
    },
    setDocumentLayout(next, nextPages) {
      const changedPages = pages !== nextPages;
      pages = nextPages;
      if (bounds?.x === next.x && bounds.y === next.y && bounds.width === next.width && bounds.height === next.height
        && !((mode === "fit-page" || mode === "fit-content") && changedPages)) return;
      bounds = { ...next };
      schedule();
    },
    setZoom(percent, nextMode) {
      if (requestedScale === percent / 100 && mode === nextMode) return;
      requestedScale = percent / 100;
      mode = nextMode;
      schedule();
    },
    getContentFitZoom() { return calculateContentFitZoom(readingBody(), viewport.clientWidth); },
    setZoomAnchor(x, y) {
      anchor = { x, y, documentX: (viewport.scrollLeft + horizontalOffset + x - paperStart) / scale, documentY: (viewport.scrollTop + y) / scale };
    },
    schedule,
    destroy() {
      destroyed = true;
      cancelAnimationFrame(frame);
      observer.disconnect();
      viewport.removeEventListener("scroll", captureScroll);
      header.destroy();
      delete viewport.dataset.scrollAxis;
    }
  };
}
