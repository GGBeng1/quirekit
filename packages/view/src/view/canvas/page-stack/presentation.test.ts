import type { QuireLayoutPage } from "@quirekit/view-engine";
import { describe, expect, it, vi } from "vitest";
import {
  FakeCanvasMountDocument
} from "../../../../test-support/mount/canvas";
import {
  createPageStackFillSchedulerHarness,
  runScheduledPageStackFillCallback
} from "../../../test-support/page-stack-fill";
import { createCanvasPageStackPresentation } from "./presentation";

/**
 * Creates one vertically stacked page for presentation ownership tests.
 *
 * @param pageIndex - Zero-based page index.
 * @returns Layout page with an 80-pixel document-space extent.
 */
function page(pageIndex: number): QuireLayoutPage {
  const y = pageIndex * 80;

  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex },
    pageRect: { x: 0, y, width: 300, height: 80 },
    bodyRect: { x: 20, y: y + 10, width: 260, height: 60 }
  } as QuireLayoutPage;
}

describe("CanvasPageStackPresentation", () => {
  it("owns viewport realization and tears down its page resources once", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const host = ownerDocument.createElement("div");
    const visiblePages: number[][] = [];
    const fillScheduler = createPageStackFillSchedulerHarness();

    root.clientWidth = 300;
    root.clientHeight = 80;
    root.appendChild(host);

    const presentation = createCanvasPageStackPresentation({
      root: root as unknown as HTMLElement,
      host: host as unknown as HTMLElement,
      runtime: {
        pageStack: true,
        scrollSource: "viewport",
        scrollViewport: root as unknown as HTMLElement,
        scrollBufferPages: 0,
        onVisiblePagesChange(pageIndices) {
          visiblePages.push([...pageIndices]);
        }
      },
      fill: {
        scheduler: fillScheduler.scheduler,
        executePass: () => ({ action: "advance", render: true }),
        onAdvance: vi.fn()
      },
      readRenderState: () => null,
      requestDocumentRefresh: vi.fn()
    });

    presentation.replacePages([page(0), page(1), page(2)], 0);
    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([0]);
    expect(host.children).toHaveLength(2);
    expect(host.children[0]?.className).toBe("qk-page-placeholders");
    expect(presentation.getFrames()[0]?.surface.frame.style.visibility).toBe("hidden");

    root.scrollTop = 80;
    root.dispatchEvent({ type: "scroll" } as Event & { type: string });

    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([1]);
    expect(host.children).toHaveLength(2);
    expect(visiblePages).toEqual([[0], [1]]);

    presentation.destroy();
    presentation.destroy();

    expect(root.listenerCount("scroll")).toBe(0);
    expect(host.children).toHaveLength(0);
    expect(() => presentation.getFrames()).toThrow(RangeError);
  });

  it("owns viewport-first fill policy, progression, and cancellation", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const root = ownerDocument.createElement("section");
    const host = ownerDocument.createElement("div");
    const fillScheduler = createPageStackFillSchedulerHarness();
    const executePass = vi.fn(() => ({
      action: "advance" as const,
      render: true
    }));
    const onAdvance = vi.fn();

    root.clientWidth = 300;
    root.clientHeight = 80;
    root.appendChild(host);

    const presentation = createCanvasPageStackPresentation({
      root: root as unknown as HTMLElement,
      host: host as unknown as HTMLElement,
      runtime: {
        pageStack: true,
        scrollSource: "viewport",
        scrollViewport: root as unknown as HTMLElement
      },
      fill: {
        scheduler: fillScheduler.scheduler,
        executePass,
        onAdvance
      },
      readRenderState: () => null,
      requestDocumentRefresh: vi.fn()
    });

    presentation.replacePages([page(0), page(1), page(2)], 0);
    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([0]);

    expect(presentation.prepareFillRender({
      totalBlockCount: 40,
      initial: true
    })).toEqual({
      maxBlocks: 12,
      maxShapedBlockExtent: 80,
      initialWindowActive: true
    });
    expect(fillScheduler.bridges).toHaveLength(1);

    runScheduledPageStackFillCallback(fillScheduler.bridges[0]!);
    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([0]);
    expect(fillScheduler.passes).toHaveLength(1);
    runScheduledPageStackFillCallback(fillScheduler.passes[0]!);

    expect(executePass).toHaveBeenCalledWith(expect.objectContaining({
      total: 40,
      fromIndex: 12,
      toIndex: 20,
      complete: false
    }));
    expect(onAdvance).toHaveBeenCalledWith({
      complete: false,
      blockLimit: 20,
      render: true
    });
    expect(fillScheduler.passes).toHaveLength(2);

    presentation.destroy();
    expect(fillScheduler.passes[1]?.cancelled).toBe(true);
  });
});
