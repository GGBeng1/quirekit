import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument, type FakeSvgMountElement } from "@quirekit/view/test-support/svg-mount";
import type { HtmlMeasuredClientRect, HtmlMeasuredDomPoint } from "../measurement";
import { createHtmlSelectionRuntime } from "./runtime";

describe("retained HTML selection runtime", () => {
  it("reads the local caret theme once only for a visible editable caret", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("div"), documentRoot = ownerDocument.createElement("div");
    const text = ownerDocument.createTextNode("source");
    documentRoot.appendChild(text);
    let color = "rgb(230, 234, 240)";
    const getPropertyValue = vi.fn(() => color);
    const getComputedStyle = vi.fn(() => ({ getPropertyValue, color: "rgb(10, 20, 30)" }));
    Object.assign(ownerDocument.defaultView, { getComputedStyle });
    const runtime = createHtmlSelectionRuntime({ ownerDocument: ownerDocument as unknown as Document,
      host: host as unknown as HTMLElement, documentRoot: documentRoot as unknown as HTMLElement });
    const input = { focusOwner: "document" as const, editable: true, surfaceClientRect: clientRect(0, 0, 320, 180),
      caret: measuredRect(10, 10, 11, 30, "caret"), selectionRects: [], mirror: mirror(text, 1, text, 1),
      selectionFillStyle: "#bfdbfe", caretFillStyle: "#123456" };
    runtime.sync(input);
    expect(caretElement(host)?.style.backgroundColor).toBe(color);
    expect(getComputedStyle).toHaveBeenCalledExactlyOnceWith(documentRoot);
    expect(getPropertyValue).toHaveBeenCalledExactlyOnceWith("--qk-html-caret-color");
    for (const override of [{ editable: false }, { focusOwner: "outside" as const }, { caret: undefined }]) {
      runtime.sync({ ...input, ...override });
    }
    expect(getComputedStyle).toHaveBeenCalledTimes(1);
    color = "";
    runtime.sync(input);
    expect(caretElement(host)?.style.backgroundColor).toBe("#123456");
    color = "currentColor";
    runtime.sync(input);
    expect(caretElement(host)?.style.backgroundColor).toBe("rgb(10, 20, 30)");
    runtime.destroy();
  });

  it("reuses pooled rectangles and themed fill while preserving UI owns focus", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("div");
    const documentRoot = ownerDocument.createElement("div");
    const text = ownerDocument.createTextNode("abcdef");
    const setBaseAndExtent = vi.fn();

    documentRoot.appendChild(text);
    (ownerDocument as unknown as { getSelection: () => Selection }).getSelection =
      () => ({ setBaseAndExtent } as unknown as Selection);
    const runtime = createHtmlSelectionRuntime({
      ownerDocument: ownerDocument as unknown as Document,
      host: host as unknown as HTMLElement,
      documentRoot: documentRoot as unknown as HTMLElement
    });
    runtime.sync({
      focusOwner: "document",
      editable: true,
      surfaceClientRect: clientRect(100, 200, 500, 400),
      caret: measuredRect(140, 220, 141, 240, "caret"),
      selectionRects: [
        measuredRect(120, 230, 180, 250, "line-1"),
        measuredRect(120, 250, 210, 270, "line-2")
      ],
      mirror: mirror(text, 1, text, 5),
      selectionFillStyle: "rgba(1, 2, 3, 0.4)",
      caretFillStyle: "#123456"
    });

    const firstPass = selectionRectElements(host);
    expect(firstPass).toHaveLength(2);
    const surface = host.children.find(child => child.tagName === "svg")!;
    expect(firstPass[0]!.namespace).toBe("http://www.w3.org/2000/svg");
    expect(firstPass[0]!.tagName).toBe("rect");
    expect(firstPass[0]!.getAttribute("x")).toBe("20");
    expect(firstPass[0]!.getAttribute("y")).toBe("30");
    expect(surface.getAttribute("fill")).toBe("rgba(1, 2, 3, 0.4)");
    expect(setBaseAndExtent).not.toHaveBeenCalled();

    runtime.sync({
      focusOwner: "selection-preserving-ui",
      editable: true,
      surfaceClientRect: clientRect(100, 200, 500, 400),
      selectionRects: [measuredRect(130, 240, 190, 260, "line-1")],
      mirror: mirror(text, 1, text, 5),
      selectionFillStyle: "rgba(1, 2, 3, 0.4)",
      caretFillStyle: "#123456"
    });

    const secondPass = selectionRectElements(host);
    expect(secondPass).toHaveLength(2);
    expect(secondPass[0]).toBe(firstPass[0]);
    expect(surface.getAttribute("fill")).toBe("rgba(1, 2, 3, 0.4)");
    expect(secondPass[1]!.style.display).toBe("none");
    expect(caretElement(host)?.style.display).toBe("none");
  });

  it.each(["outside", "node-view-control", "nested-embed"] as const)(
    "preserves selection color and hides the caret for %s focus",
    focusOwner => {
      const ownerDocument = new FakeSvgMountDocument();
      const host = ownerDocument.createElement("div");
      const documentRoot = ownerDocument.createElement("div");
      const runtime = createHtmlSelectionRuntime({
        ownerDocument: ownerDocument as unknown as Document,
        host: host as unknown as HTMLElement,
        documentRoot: documentRoot as unknown as HTMLElement
      });
      runtime.sync({
        focusOwner, editable: true, surfaceClientRect: clientRect(0, 0, 320, 180),
        caret: measuredRect(10, 10, 11, 30, "caret"),
        selectionRects: [measuredRect(8, 8, 108, 48, "selection")],
        selectionFillStyle: "rgba(10, 108, 255, 0.14)",
        caretFillStyle: "#111827"
      });
      expect(host.children.find(child => child.tagName === "svg")!.getAttribute("fill"))
        .toBe("rgba(10, 108, 255, 0.14)");
      expect(caretElement(host)?.style.display).toBe("none");
      runtime.destroy();
      expect(host.children).toHaveLength(0);
    }
  );

  it("hides the caret for readonly views while keeping node-selection rectangles", () => {
    const ownerDocument = new FakeSvgMountDocument();
    const host = ownerDocument.createElement("div");
    const documentRoot = ownerDocument.createElement("div");
    const text = ownerDocument.createTextNode("readonly");
    const setBaseAndExtent = vi.fn();

    documentRoot.appendChild(text);
    (ownerDocument as unknown as { getSelection: () => Selection }).getSelection =
      () => ({ setBaseAndExtent } as unknown as Selection);
    const runtime = createHtmlSelectionRuntime({
      ownerDocument: ownerDocument as unknown as Document,
      host: host as unknown as HTMLElement,
      documentRoot: documentRoot as unknown as HTMLElement
    });

    runtime.sync({
      focusOwner: "document",
      editable: false,
      surfaceClientRect: clientRect(0, 0, 320, 180),
      caret: measuredRect(10, 10, 11, 30, "caret"),
      selectionRects: [measuredRect(8, 8, 108, 48, "node")],
      mirror: mirror(text, 1, text, 5),
      selectionFillStyle: "#bfdbfe",
      caretFillStyle: "#111827"
    });

    expect(selectionRectElements(host)[0]!.style.display).toBe("block");
    expect(caretElement(host)?.style.display).toBe("none");
    expect(setBaseAndExtent).toHaveBeenCalledWith(text, 1, text, 5);
  });
});

/**
 * Creates one measured rectangle fixture.
 *
 * @param left - Client-space left edge.
 * @param top - Client-space top edge.
 * @param right - Client-space right edge.
 * @param bottom - Client-space bottom edge.
 * @param descriptorId - Stable retained owner identity.
 * @returns Measured rectangle fixture.
 */
function measuredRect(
  left: number,
  top: number,
  right: number,
  bottom: number,
  descriptorId: string
): HtmlMeasuredClientRect {
  return {
    left,
    top,
    right,
    bottom,
    descriptorId,
    source: { sourceId: descriptorId },
    rootId: "html:root",
    regionId: "html:body"
  };
}

/**
 * Creates one client rectangle fixture.
 *
 * @param left - Client-space left edge.
 * @param top - Client-space top edge.
 * @param width - Rectangle width.
 * @param height - Rectangle height.
 * @returns DOM rectangle fixture.
 */
function clientRect(left: number, top: number, width: number, height: number): DOMRect {
  return { left, top, right: left + width, bottom: top + height, width, height } as DOMRect;
}

/**
 * Creates native mirror endpoints.
 *
 * @param anchorNode - Native anchor node.
 * @param anchorOffset - Native anchor offset.
 * @param headNode - Native head node.
 * @param headOffset - Native head offset.
 * @returns Owned native mirror endpoints.
 */
function mirror(
  anchorNode: FakeSvgMountElement,
  anchorOffset: number,
  headNode: FakeSvgMountElement,
  headOffset: number
): { readonly anchor: HtmlMeasuredDomPoint; readonly head: HtmlMeasuredDomPoint } {
  return {
    anchor: measuredPoint(anchorNode, anchorOffset, "anchor"),
    head: measuredPoint(headNode, headOffset, "head")
  };
}

/**
 * Creates one measured DOM point fixture.
 *
 * @param node - Retained DOM node.
 * @param offset - DOM offset.
 * @param descriptorId - Stable retained owner identity.
 * @returns Measured DOM point fixture.
 */
function measuredPoint(
  node: FakeSvgMountElement,
  offset: number,
  descriptorId: string
): HtmlMeasuredDomPoint {
  return {
    node: node as unknown as Node,
    offset,
    descriptorId,
    source: { sourceId: descriptorId },
    rootId: "html:root",
    regionId: "html:body"
  };
}

/**
 * Reads pooled selection rectangles from the fake host.
 *
 * @param host - Overlay host containing pooled rectangles.
 * @returns Pooled selection rectangle elements.
 */
function selectionRectElements(host: FakeSvgMountElement): FakeSvgMountElement[] {
  return host.children.flatMap(child => [child, ...child.children])
    .filter(child => child.dataset.qkSelectionRect === "");
}

/**
 * Reads the custom caret element from the fake host.
 *
 * @param host - Overlay host containing the custom caret.
 * @returns Custom caret element when allocated.
 */
function caretElement(host: FakeSvgMountElement): FakeSvgMountElement | undefined {
  return host.children.find((child) => child.dataset.qkCaret === "");
}
