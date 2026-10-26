import { canvasPageFrame } from "./adapter";
import { describe, expect, it } from "vitest";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import {
  applyCanvasPageStackFrameGeometry,
  createCanvasPageStackFrameElements
} from "./frames";

describe("page-stack frame primitives", () => {
  it("creates a detached frame with content and overlay canvases", () => {
    const ownerDocument = new FakeCanvasMountDocument();

    const elements = createCanvasPageStackFrameElements(ownerDocument as unknown as Document);

    expect(elements.frame.tagName).toBe("div");
    expect(elements.frame.style.position).toBe("absolute");
    expect(elements.content.tagName).toBe("canvas");
    expect(elements.overlay.tagName).toBe("canvas");
    // The frame is detached until the manager mounts it.
    expect(elements.frame.children).toHaveLength(2);
  });

  it("positions and sizes a frame with a DPR backing store", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const elements = createCanvasPageStackFrameElements(ownerDocument as unknown as Document);

    applyCanvasPageStackFrameGeometry(
      elements,
      3,
      { x: 0, y: 210, width: 100, height: 60 },
      2
    );

    expect(elements.frame.dataset.qkPage).toBe("3");
    expect(elements.frame.style.top).toBe("210px");
    expect(elements.frame.style.height).toBe("60px");
    expect(elements.content.style.width).toBe("100px");
    expect(elements.content.width).toBe(200);
    expect(elements.overlay.height).toBe(120);
  });

  it("builds a frame descriptor from a positioned bundle", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const elements = createCanvasPageStackFrameElements(ownerDocument as unknown as Document);
    const pageRect = { x: 0, y: 70, width: 100, height: 60 };

    const frame = canvasPageFrame({ surface: elements, pageIndex: 1, pageRect });

    expect(frame.pageIndex).toBe(1);
    expect(frame.pageRect).toBe(pageRect);
    expect(frame.frame).toBe(elements.frame);
    expect(frame.content).toBe(elements.content);
    expect(frame.overlay).toBe(elements.overlay);
  });

  it("reuses equal-size backing stores when a pooled frame changes pages", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const elements = createCanvasPageStackFrameElements(ownerDocument as unknown as Document);
    applyCanvasPageStackFrameGeometry(elements, 0, { x: 0, y: 0, width: 100, height: 60 }, 3);
    const contentWrites = observeBackingSizes(elements.content);
    const overlayWrites = observeBackingSizes(elements.overlay);
    applyCanvasPageStackFrameGeometry(elements, 1, { x: 0, y: 70, width: 100, height: 60 }, 3);
    expect(contentWrites).toEqual([]);
    expect(overlayWrites).toEqual([]);
    expect(elements.content.dataset.qkContentPaintEpoch).toBe("2");
    expect(elements.frame.dataset.qkPage).toBe("1");
  });

  it("never allocates the cross-product of old and new backing dimensions", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const elements = createCanvasPageStackFrameElements(ownerDocument as unknown as Document);
    applyCanvasPageStackFrameGeometry(elements, 0, { x: 0, y: 0, width: 10, height: 1000 }, 1);
    const writes = observeBackingSizes(elements.content);
    const previousOverlayEpoch = elements.overlay.dataset.qkOverlayPaintEpoch;
    applyCanvasPageStackFrameGeometry(elements, 0, { x: 0, y: 0, width: 1000, height: 10 }, 1);
    expect(writes.length).toBeGreaterThan(0);
    expect(writes.every(([width, height]) => width * height <= 10_000)).toBe(true);
    expect([elements.content.width, elements.content.height]).toEqual([1000, 10]);
    expect(elements.overlay.dataset.qkOverlayPaintEpoch).not.toBe(previousOverlayEpoch);
  });

});

/** @param canvas - Page canvas to observe. @returns Pixel dimensions after each native setter call. */
function observeBackingSizes(canvas: HTMLCanvasElement): Array<readonly [number, number]> {
  const writes: Array<readonly [number, number]> = [];
  const sizes = { width: canvas.width, height: canvas.height };
  for (const key of ["width", "height"] as const) {
    Object.defineProperty(canvas, key, {
      configurable: true,
      get: () => sizes[key],
      set: (value: number) => { sizes[key] = value; writes.push([sizes.width, sizes.height]); }
    });
  }
  return writes;
}
