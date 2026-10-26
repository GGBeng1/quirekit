import { createEditor } from "@quirekit/core";
import { describe, expect, it } from "vitest";
import { createSvgViewAdapter } from "./adapter";
import { FakeSvgMountDocument } from "../../../test-support/mount/svg";

describe("SVG view adapter", () => {
  it("mounts an SVG view shell for SVG mode", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const adapter = createSvgViewAdapter({
      runtime: {
        width: 100,
        height: 50
      }
    });
    const view = adapter.mount({
      editor: createEditor(),
      id: "svg-adapter",
      mode: "svg",
      status: "primary",
      element: host as unknown as HTMLElement,
      ownerDocument: ownerDocument as unknown as Document
    });

    expect(view.mode).toBe("svg");
    expect(view.elements.documentSurface.dataset.qkDocumentSurface).toBe("");
    expect(view.elements.pageStackHost.dataset.qkPageStack).toBe("");
    expect(host.children).toEqual([view.elements.root]);
  });

  it("rejects non-SVG modes", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("section");
    const adapter = createSvgViewAdapter();

    expect(() =>
      adapter.mount({
        editor: createEditor(),
        id: "wrong-mode",
        mode: "canvas",
        status: "primary",
        element: host as unknown as HTMLElement,
        ownerDocument: ownerDocument as unknown as Document
      })
    ).toThrow("SVG view adapter cannot mount mode: canvas");
  });
});
