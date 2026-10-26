import { describe, expect, it } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import { measureHtmlMountedSurfaceState } from "./surface";

describe("retained HTML surface geometry", () => {
  it("uses the retained document's natural height instead of the outer mount height", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const contentSurface = ownerDocument.createElement("div");
    const documentRoot = ownerDocument.createElement("article");
    const overlaySurface = ownerDocument.createElementNS(
      "http://www.w3.org/2000/svg",
      "svg"
    );
    contentSurface.setAttribute("width", "320");
    contentSurface.setAttribute("height", "180");
    documentRoot.setAttribute("width", "320");
    documentRoot.setAttribute("height", "640");
    contentSurface.appendChild(documentRoot);

    const state = measureHtmlMountedSurfaceState({
      contentSurface: contentSurface as unknown as HTMLElement,
      documentRoot: documentRoot as unknown as HTMLElement,
      overlaySurface: overlaySurface as unknown as SVGSVGElement,
      runtime: { width: 320, height: 200 }
    });

    expect(state.displaySize).toEqual({ width: 320, height: 640 });
    expect(state.surfaceBounds).toEqual({ x: 0, y: 0, width: 320, height: 640 });
  });
});
