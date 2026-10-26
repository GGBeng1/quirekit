// @vitest-environment happy-dom

import { describe, expect, it } from "vitest";
import {
  applySvgPageStackFrameGeometry,
  createSvgPageStackFrameElements
} from "./frames";

describe("svg page-stack frames", () => {
  it("creates a detached frame with content and overlay svgs", () => {
    const elements = createSvgPageStackFrameElements(document);
    expect(elements.frame.tagName).toBe("DIV");
    expect(elements.content.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(elements.overlay.namespaceURI).toBe("http://www.w3.org/2000/svg");
    expect(elements.frame.parentElement).toBeNull();
  });

  it("positions the frame and sets a page-local viewBox", () => {
    const elements = createSvgPageStackFrameElements(document);
    applySvgPageStackFrameGeometry(elements, 1, { x: 0, y: 100, width: 80, height: 100 });
    expect(elements.frame.style.top).toBe("100px");
    expect(elements.frame.style.width).toBe("80px");
    expect(elements.content.getAttribute("viewBox")).toBe("0 100 80 100");
    expect(elements.content.style.width).toBe("80px");
    expect(elements.frame.dataset.qkPage).toBe("1");
  });
});
