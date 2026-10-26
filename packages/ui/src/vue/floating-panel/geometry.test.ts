import { describe, expect, it } from "vitest";
import { resolveFloatingPanelLayout } from "./geometry";

describe("floating utility panel", () => {
  const viewport = { x: 224, y: 120, width: 1000, height: 700 };
  it("anchors to the supplied document viewport rather than the product header or outline", () => {
    expect(resolveFloatingPanelLayout(viewport, 250, null)).toEqual({ x: 872, y: 132, width: 340, maxHeight: 676 });
  });
  it("retains user placement but confines it after viewport or panel resizing", () => {
    expect(resolveFloatingPanelLayout(viewport, 250, { x: 450, y: 300 })).toMatchObject({ x: 450, y: 300 });
    expect(resolveFloatingPanelLayout(viewport, 400, { x: 1100, y: 700 })).toMatchObject({ x: 872, y: 408 });
    expect(resolveFloatingPanelLayout(viewport, 250, { x: -20, y: -10 })).toMatchObject({ x: 236, y: 132 });
  });
  it("shrinks to embedded and narrow viewports without forcing a minimum overflowing width", () => {
    expect(resolveFloatingPanelLayout({ x: 0, y: 120, width: 240, height: 350 }, 500, null))
      .toEqual({ x: 12, y: 132, width: 216, maxHeight: 326 });
  });
  it("uses the visible client area excluding the scrollbar", () => {
    const layout = resolveFloatingPanelLayout({ ...viewport, width: viewport.width - 15 }, 250, null);
    expect(layout.x + layout.width).toBe(viewport.x + viewport.width - 15 - 12);
  });
  it("keeps non-negative bounds while a collapsed product is hidden", () => {
    expect(resolveFloatingPanelLayout({ x: 0, y: 0, width: 0, height: 0 }, 100, null))
      .toEqual({ x: 0, y: 0, width: 0, maxHeight: 0 });
  });
});
