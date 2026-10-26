import type { QuireLayoutPage } from "@quirekit/view-engine";
import { describe, expect, it, vi } from "vitest";
import {
  FakeSvgMountDocument,
  type FakeSvgMountElement
} from "../../../../test-support/mount/svg";
import {
  createPageStackFillSchedulerHarness,
  runScheduledPageStackFillCallback
} from "../../../test-support/page-stack-fill";
import { createSvgPageStackPresentation } from "./presentation";

/**
 * Creates one vertically stacked SVG layout page.
 *
 * @param pageIndex - Zero-based page index.
 * @returns Layout page with an 80-pixel document-space extent.
 */
function page(pageIndex: number): QuireLayoutPage {
  const y = pageIndex * 80;

  return {
    pageIndex,
    range: { from: pageIndex, to: pageIndex },
    pageRect: { x: 0, y, width: 320, height: 80 },
    bodyRect: { x: 20, y: y + 10, width: 280, height: 60 }
  } as QuireLayoutPage;
}

/** SVG presentation elements hosted by one explicit ancestor scroller. */
interface SvgPresentationScrollFixture {
  /** Scroll authority discovered by the mounted presentation. */
  readonly scrollHost: FakeSvgMountElement & {
    clientHeight: number;
    clientWidth: number;
    scrollLeft: number;
    scrollTop: number;
  };
  /** Mounted SVG root inside the scroll authority. */
  readonly root: FakeSvgMountElement & {
    clientHeight: number;
    clientWidth: number;
  };
  /** Document-space element whose client position follows scrolling. */
  readonly documentSurface: FakeSvgMountElement;
  /** Sparse page-frame host inside the document surface. */
  readonly host: FakeSvgMountElement;
  /** Updates the document surface client-space top after a synthetic scroll. */
  readonly setSurfaceTop: (top: number) => void;
}

/**
 * Creates the browser geometry needed by direct SVG presentation tests.
 *
 * @param ownerDocument - Fake owner document used by the mounted resource.
 * @returns Scroll authority, mounted elements, and a surface-position updater.
 */
function createSvgPresentationScrollFixture(
  ownerDocument: FakeSvgMountDocument
): SvgPresentationScrollFixture {
  const scrollHost = ownerDocument.createElement("section") as
    SvgPresentationScrollFixture["scrollHost"];
  const root = ownerDocument.createElement("div") as
    SvgPresentationScrollFixture["root"];
  const documentSurface = ownerDocument.createElement("div");
  const host = ownerDocument.createElement("div");
  let surfaceTop = 0;
  const scrollHostElement = scrollHost as unknown as Element;
  const fakeWindow = {
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    getComputedStyle: (element: Element) => ({
      overflow: element === scrollHostElement ? "auto" : "visible",
      overflowX: "visible",
      overflowY: element === scrollHostElement ? "auto" : "visible"
    })
  } as unknown as Window;

  Object.defineProperty(ownerDocument, "defaultView", { value: fakeWindow });
  scrollHost.clientWidth = 320;
  scrollHost.clientHeight = 80;
  scrollHost.scrollLeft = 0;
  scrollHost.scrollTop = 0;
  root.clientWidth = 320;
  root.clientHeight = 80;
  scrollHost.getBoundingClientRect = () => ({
    x: 0,
    y: 0,
    left: 0,
    top: 0,
    right: 320,
    bottom: 80,
    width: 320,
    height: 80,
    toJSON: () => ({})
  }) as DOMRect;
  documentSurface.getBoundingClientRect = () => ({
    x: 0,
    y: surfaceTop,
    left: 0,
    top: surfaceTop,
    right: 320,
    bottom: surfaceTop + 320,
    width: 320,
    height: 320,
    toJSON: () => ({})
  }) as DOMRect;
  root.append(documentSurface, host);
  scrollHost.appendChild(root);

  return {
    scrollHost,
    root,
    documentSurface,
    host,
    setSurfaceTop(top) {
      surfaceTop = top;
    }
  };
}

describe("SvgPageStackPresentation", () => {
  it("owns sparse page realization across ancestor scroll changes", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const fixture = createSvgPresentationScrollFixture(ownerDocument);
    const { scrollHost, root, documentSurface, host } = fixture;
    const visiblePages: number[][] = [];
    const fillScheduler = createPageStackFillSchedulerHarness();

    const presentation = createSvgPageStackPresentation({
      root: root as unknown as HTMLElement,
      documentSurface: documentSurface as unknown as HTMLElement,
      host: host as unknown as HTMLElement,
      runtime: {
        onVisiblePagesChange(pageIndices) {
          visiblePages.push([...pageIndices]);
        }
      },
      fill: {
        scheduler: fillScheduler.scheduler,
        onAdvance: vi.fn()
      },
      readRenderState: () => null,
      commitRenderResult: vi.fn(),
      requestDocumentRefresh: vi.fn()
    });

    presentation.replacePages([page(0), page(1), page(2), page(3)], 1);
    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([0, 1]);
    expect(host.children).toHaveLength(3);
    expect(host.children[0]?.className).toBe("qk-page-placeholders");
    expect(presentation.getFrames()[0]?.surface.frame.style.visibility).toBe("hidden");

    fixture.setSurfaceTop(-160);
    scrollHost.scrollTop = 160;
    scrollHost.dispatchEvent({ type: "scroll" } as Event);

    expect(presentation.getFrames().map((frame) => frame.pageIndex)).toEqual([1, 2, 3]);
    expect(host.children).toHaveLength(4);
    expect(visiblePages).toEqual([[0, 1], [1, 2, 3]]);

    presentation.destroy();
    presentation.destroy();

    expect(host.children).toHaveLength(0);
    expect(() => presentation.getFrames()).toThrow(RangeError);
  });

  it("owns viewport-first fill policy, progression, and cancellation", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const { root, documentSurface, host } =
      createSvgPresentationScrollFixture(ownerDocument);
    const fillScheduler = createPageStackFillSchedulerHarness();
    const onAdvance = vi.fn();

    const presentation = createSvgPageStackPresentation({
      root: root as unknown as HTMLElement,
      documentSurface: documentSurface as unknown as HTMLElement,
      host: host as unknown as HTMLElement,
      fill: {
        scheduler: fillScheduler.scheduler,
        onAdvance
      },
      readRenderState: () => null,
      commitRenderResult: vi.fn(),
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
