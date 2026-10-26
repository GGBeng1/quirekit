import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createCanvasViewAdapter } from "./adapter";
import { FakeCanvasMountDocument } from "../../../test-support/mount/canvas";

describe("canvas view adapter", () => {
  it("mounts a canvas view shell for canvas mode", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("section");
    const adapter = createCanvasViewAdapter({
      runtime: {
        width: 100,
        height: 50,
        devicePixelRatio: 2
      }
    });
    const view = adapter.mount({
      editor: createEditor(),
      id: "canvas-adapter",
      mode: "canvas",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document
    });

    expect(view.mode).toBe("canvas");
    expect(view.elements.contentSurface!.width).toBe(200);
    expect(host.children).toEqual([view.elements.root]);
  });

  it("rejects non-canvas modes", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("section");
    const adapter = createCanvasViewAdapter();

    expect(() =>
      adapter.mount({
        editor: createEditor(),
        id: "wrong-mode",
        mode: "svg",
        status: "primary",
        element: host as unknown as HTMLElement,
        ownerDocument: ownerDocument as unknown as Document
      })
    ).toThrow("Canvas view adapter cannot mount mode: svg");
  });
});
