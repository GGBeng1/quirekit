import { describe, expect, it } from "vitest";
import { FakeCanvasMountDocument } from "../../../../test-support/mount/canvas";
import { applyDocumentHeightSizing } from "./document-height-sizer";

describe("applyDocumentHeightSizing", () => {
  it("sizes the in-flow View, page-stack host, and coordinate surfaces to the document height", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const scrollSurface = ownerDocument.createElement("div");
    const pageStackHost = ownerDocument.createElement("div");
    const coordinateSurface = ownerDocument.createElement("div");
    const documentSurface = ownerDocument.createElement("div");

    applyDocumentHeightSizing({
      targets: {
        scrollSurface: scrollSurface as unknown as HTMLElement,
        pageStackHost: pageStackHost as unknown as HTMLElement,
        coordinateSurface: coordinateSurface as unknown as HTMLElement,
        documentSurface: documentSurface as unknown as HTMLElement
      },
      documentRect: { x: 0, y: 0, width: 816, height: 2340 }
    });

    expect(scrollSurface.style.height).toBe("2340px");
    expect(pageStackHost.style.height).toBe("2340px");
    expect(coordinateSurface.style.height).toBe("2340px");
    expect(documentSurface.style.height).toBe("2340px");
  });

  it("adds trailing scroll space without stretching pointer coordinates", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const host = ownerDocument.createElement("div");
    const scrollSurface = ownerDocument.createElement("div");
    const pointer = ownerDocument.createElement("div");
    const document = ownerDocument.createElement("div");
    applyDocumentHeightSizing({
      targets: {
        scrollSurface: scrollSurface as unknown as HTMLElement,
        pageStackHost: host as unknown as HTMLElement,
        coordinateSurface: pointer as unknown as HTMLElement,
        documentSurface: document as unknown as HTMLElement
      },
      documentRect: { x: 0, y: 28, width: 816, height: 2000 },
      bottomPadding: 28
    });
    expect(scrollSurface.style.height).toBe("2056px");
    expect(host.style.height).toBe("2056px");
    expect(pointer.style.height).toBe("2028px");
    expect(document.style.height).toBe("2028px");
  });

  it("extends to the document bottom when the document has a top offset", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const pageStackHost = ownerDocument.createElement("div");

    applyDocumentHeightSizing({
      targets: { pageStackHost: pageStackHost as unknown as HTMLElement },
      documentRect: { x: 0, y: 40, width: 816, height: 2000 }
    });

    expect(pageStackHost.style.height).toBe("2040px");
  });

  it("leaves the pointer layer untouched when not provided", () => {
    const ownerDocument = new FakeCanvasMountDocument();
    const pageStackHost = ownerDocument.createElement("div");

    applyDocumentHeightSizing({
      targets: { pageStackHost: pageStackHost as unknown as HTMLElement },
      documentRect: { x: 0, y: 0, width: 100, height: 1000 }
    });

    expect(pageStackHost.style.height).toBe("1000px");
  });
});
