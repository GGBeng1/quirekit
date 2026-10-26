import type { QuireLayoutPage } from "@quirekit/view-engine";
import type { QuirePageFrame } from "../types";
import { positionPageStackFrame } from "../frames";
import { PAGE_PLACEHOLDER_STYLES } from "./styles";

/** Retains cheap paper chrome for known pages without allocating drawing surfaces. */
export class PageStackPlaceholders {
  private readonly layer: HTMLElement;
  private readonly papers = new Map<number, HTMLElement>();
  private readonly ready = new Set<number>();

  /**
   * Mounts the persistent inert paper layer beneath backend surfaces.
   * @param host - Page stack using canonical document coordinates.
   * @param ownerDocument - Document creating the chrome nodes.
   */
  constructor(host: HTMLElement, private readonly ownerDocument: Document) {
    this.layer = ownerDocument.createElement("div");
    this.layer.className = "qk-page-placeholders";
    this.layer.setAttribute("aria-hidden", "true");
    const style = ownerDocument.createElement("style");
    style.textContent = PAGE_PLACEHOLDER_STYLES;
    this.layer.appendChild(style);
    host.appendChild(this.layer);
  }

  /**
   * Installs accepted page sizes before any viewport-dependent content work.
   * @param pages - Canonical pages; dimensions already include document layout policy.
   */
  replacePages(pages: readonly QuireLayoutPage[]): void {
    const retained = new Set<number>();
    for (const { pageIndex, pageRect } of pages) {
      retained.add(pageIndex);
      let paper = this.papers.get(pageIndex);
      if (paper === undefined) {
        paper = this.ownerDocument.createElement("div");
        paper.className = "qk-page-placeholder";
        paper.dataset.qkPagePlaceholder = String(pageIndex);
        this.layer.appendChild(paper);
        this.papers.set(pageIndex, paper);
      }
      positionPageStackFrame(paper, pageRect);
    }
    for (const [pageIndex, paper] of this.papers) {
      if (retained.has(pageIndex)) continue;
      paper.remove();
      this.papers.delete(pageIndex);
      this.ready.delete(pageIndex);
    }
  }

  /**
   * Restores loading when a painted surface is retired or its geometry is replaced.
   * @param frames - Currently mounted surfaces.
   * @param changed - Surfaces requiring successful repaint before becoming ready.
   */
  retain(frames: readonly QuirePageFrame<unknown>[], changed: readonly QuirePageFrame<unknown>[]): void {
    const mounted = new Set(frames.map((frame) => frame.pageIndex));
    const invalid = new Set(changed.map((frame) => frame.pageIndex));
    for (const pageIndex of this.ready) {
      if (mounted.has(pageIndex) && !invalid.has(pageIndex)) continue;
      const paper = this.papers.get(pageIndex);
      if (paper !== undefined) paper.dataset.qkPageReady = "false";
      this.ready.delete(pageIndex);
    }
  }

  /**
   * Exposes backend pixels only after the paint completed successfully.
   * @param frames - Successfully painted mounted surfaces.
   */
  markPainted(frames: readonly QuirePageFrame<unknown>[]): void {
    for (const { pageIndex } of frames) {
      const paper = this.papers.get(pageIndex);
      if (paper === undefined) continue;
      paper.dataset.qkPageReady = "true";
      this.ready.add(pageIndex);
    }
  }

  /** Releases every placeholder and its scoped style owner. */
  destroy(): void {
    this.layer.remove();
    this.papers.clear();
    this.ready.clear();
  }
}
