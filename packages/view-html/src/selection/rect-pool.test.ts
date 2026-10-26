import { describe, expect, it, vi } from "vitest";
import { FakeSvgMountDocument } from "@quirekit/view/test-support/svg-mount";
import type { HtmlMeasuredClientRect } from "../measurement";
import { createHtmlSelectionRectPool } from "./rect-pool";

describe("HTML SVG selection rectangle pool", () => {
  it("retains SVG nodes, skips identical writes, and owns only its surface", () => {
    const document = new FakeSvgMountDocument();
    const host = document.createElement("div");
    const auxiliary = document.createElementNS("http://www.w3.org/2000/svg", "svg");
    host.appendChild(auxiliary);
    const pool = createHtmlSelectionRectPool(document as unknown as Document, host as unknown as HTMLElement);
    const origin = { left: 100, top: 200 };
    const rects = [rect(120.5, 230.25, 180.75, 250.5), rect(120, 250, 210, 270)];

    pool.sync(rects, origin, "#bfdbfe");
    const surface = host.children.find(child => child.getAttribute("class") === "qk-html-editor__selection")!;
    expect(surface?.tagName).toBe("svg");
    expect(surface.namespace).toBe("http://www.w3.org/2000/svg");
    expect(surface.getAttribute("aria-hidden")).toBe("true");
    expect(surface.getAttribute("viewBox")).toBeNull();
    expect(surface.style.overflow).toBe("visible");
    expect(surface.style.pointerEvents).toBe("none");
    const [first, second] = surface.children;
    expect(surface.children.map(child => child.tagName)).toEqual(["rect", "rect"]);
    expect(first!.attributes).toMatchObject({ x: "20.5", y: "30.25", width: "60.25", height: "20.25" });

    const writes = [surface, first!, second!].map(node => vi.spyOn(node, "setAttribute"));
    const allocation = vi.spyOn(document, "createElementNS");
    const geometryRead = vi.spyOn(host, "getBoundingClientRect");
    pool.sync(rects, origin, "#bfdbfe");
    for (const write of writes) expect(write).not.toHaveBeenCalled();
    expect(allocation).not.toHaveBeenCalled();
    expect(geometryRead).not.toHaveBeenCalled();

    pool.sync(rects, origin, "#cbd5e1");
    expect(writes[0]).toHaveBeenCalledExactlyOnceWith("fill", "#cbd5e1");
    expect(writes[1]).not.toHaveBeenCalled();
    expect(writes[2]).not.toHaveBeenCalled();
    pool.sync([rects[0]!], { left: 80, top: 180 }, "#cbd5e1");
    expect(first!.attributes).toMatchObject({ x: "40.5", y: "50.25" });
    expect(second!.style.display).toBe("none");
    pool.sync([], origin, "#cbd5e1");
    expect(first!.style.display).toBe("none");
    pool.sync(rects, origin, "#bfdbfe");
    expect(surface.children).toEqual([first, second]);
    expect(second!.style.display).toBe("block");
    expect(allocation).not.toHaveBeenCalled();

    pool.destroy();
    expect(host.children).toEqual([auxiliary]);
  });
});

/**
 * Creates measured client geometry without invoking a browser layout read.
 * @param left - Client left edge.
 * @param top - Client top edge.
 * @param right - Client right edge.
 * @param bottom - Client bottom edge.
 * @returns One retained selection rectangle.
 */
function rect(left: number, top: number, right: number, bottom: number): HtmlMeasuredClientRect {
  return { left, top, right, bottom, descriptorId: "text", source: { sourceId: "text" }, rootId: "html:root", regionId: "html:body" };
}
