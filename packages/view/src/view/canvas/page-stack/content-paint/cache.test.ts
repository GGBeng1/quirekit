import { canvasPageFrame } from "../adapter";
import { describe, expect, it } from "vitest";
import type { QuireDisplayCommand, QuireDisplayList } from "@quirekit/renderer";
import { FakeCanvasMountDocument } from "../../../../../test-support/mount/canvas";
import {
  applyCanvasPageStackFrameGeometry,
  createCanvasPageStackFrameElements
} from "../frames";
import { createCanvasPageStackContentPaintCache } from "./cache";
import type { CanvasPageStackContentPaintRequest } from "./types";

/** Empty page-local content list used to isolate cache state transitions. */
const emptyDisplayList: QuireDisplayList = {
  bounds: { x: 0, y: 0, width: 100, height: 60 },
  commands: []
};

/**
 * Creates one cache request whose chunk key can model a content-version change.
 *
 * @param chunkKey - Retained page-local content identity.
 * @returns Request bound to a fresh mounted-style canvas frame.
 */
function createRequest(chunkKey: string): CanvasPageStackContentPaintRequest {
  const ownerDocument = new FakeCanvasMountDocument();
  const elements = createCanvasPageStackFrameElements(
    ownerDocument as unknown as Document
  );
  const pageRect = { x: 0, y: 0, width: 100, height: 60 };
  applyCanvasPageStackFrameGeometry(elements, 0, pageRect, 1);
  return {
    frame: canvasPageFrame({ surface: elements, pageIndex: 0, pageRect }),
    chunkKey,
    sourceOwnerKeys: ["layout-node:page-0"],
    displayList: emptyDisplayList,
    viewportRect: pageRect,
    displayListIsViewportScoped: true,
    devicePixelRatio: 1
  };
}

describe("CanvasPageStackContentPaintCache retirement", () => {
  it("revokes old validity before a refresh can partially overwrite the canvas", () => {
    const cache = createCanvasPageStackContentPaintCache();
    const firstRequest = createRequest("page:0:first");
    const frame = firstRequest.frame;
    const firstDecision = cache.resolve(firstRequest);
    cache.commitPaint(frame, firstDecision);

    const refreshRequest = {
      ...firstRequest,
      chunkKey: "page:0:refresh"
    };
    expect(cache.resolve(refreshRequest).action).toBe("paint");

    // Model a painter failure by omitting commitPaint after refresh resolution.
    expect(cache.retireSurface(frame.content)).toBe(false);
    expect(cache.resolve(firstRequest).action).toBe("paint");
    expect(cache.snapshot()).toMatchObject({
      liveSurfaceSkips: 0,
      bitmapStores: 0,
      retainedBitmapEntries: 0
    });
  });

  it("skips a rebuilt page chunk whose commands paint the same, and repaints a changed one", () => {
    const cache = createCanvasPageStackContentPaintCache();
    const command: QuireDisplayCommand = { id: "fill", kind: "fill-rect", rect: { x: 0, y: 0, width: 10, height: 10 }, fillStyle: "#000" };
    const first = { ...createRequest("page:0"), displayList: { ...emptyDisplayList, commands: [command] } };
    cache.commitPaint(first.frame, cache.resolve(first));

    const rebuilt = { ...first, displayList: { ...emptyDisplayList, commands: [command] } };
    expect(cache.resolve(rebuilt).action).toBe("skip");
    const recreated = { ...first, displayList: { ...emptyDisplayList, commands: [{ ...command, id: "fill-2" }] } };
    expect(cache.resolve(recreated).action).toBe("skip");
    const changed = { ...first, displayList: { ...emptyDisplayList, commands: [{ ...command, fillStyle: "#f00" }] } };
    expect(cache.resolve(changed).action).toBe("paint");
  });

  it("follows a runtime bitmap budget without exceeding the created one", () => {
    const cache = createCanvasPageStackContentPaintCache({ maxBitmapBytes: 1000 });
    cache.setMaxBitmapBytes(400);
    expect(cache.snapshot().maxBitmapBytes).toBe(400);
    cache.setMaxBitmapBytes(5000);
    expect(cache.snapshot().maxBitmapBytes).toBe(1000);
  });
});
