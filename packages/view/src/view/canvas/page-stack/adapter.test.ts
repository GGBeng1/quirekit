// @vitest-environment happy-dom

import { describe, expect, it, vi } from "vitest";
import { createCanvasPageSurfaceAdapter } from "./adapter";

describe("createCanvasPageSurfaceAdapter", () => {
  it("creates a detached frame with content and overlay canvases", () => {
    const adapter = createCanvasPageSurfaceAdapter(() => 2);
    const surface = adapter.createSurface(document);
    expect(surface.frame.tagName).toBe("DIV");
    expect(surface.content.tagName).toBe("CANVAS");
    expect(surface.overlay.tagName).toBe("CANVAS");
    expect(surface.frame.parentElement).toBeNull();
  });

  it("applies geometry with the current device pixel ratio", () => {
    const adapter = createCanvasPageSurfaceAdapter(() => 2);
    const surface = adapter.createSurface(document);
    adapter.applyGeometry(surface, 0, { x: 0, y: 0, width: 80, height: 100 });
    expect(surface.content.width).toBe(160);
    expect(surface.content.height).toBe(200);
    expect(surface.frame.style.width).toBe("80px");
  });

  it("estimates pooled backing-store bytes for both page canvases", () => {
    const adapter = createCanvasPageSurfaceAdapter(() => 2);
    const surface = adapter.createSurface(document);
    adapter.applyGeometry(surface, 0, { x: 0, y: 0, width: 80, height: 100 });

    expect(adapter.estimatePooledSurfaceBytes?.(surface)).toBe(160 * 200 * 4 * 2);
  });

  it("attaches and detaches the frame", () => {
    const host = document.createElement("div");
    const retire = vi.fn((content: HTMLCanvasElement) => {
      expect(content.parentElement?.parentElement).toBe(host);
    });
    const adapter = createCanvasPageSurfaceAdapter(() => 1, retire);
    const surface = adapter.createSurface(document);
    adapter.attach(surface, host);
    expect(host.childElementCount).toBe(1);
    adapter.detach(surface);
    expect(host.childElementCount).toBe(0);
    expect(retire).toHaveBeenCalledOnce();
  });

  it("retires content before geometry clears the previous backing store", () => {
    const observedSizes: Array<readonly [number, number]> = [];
    const adapter = createCanvasPageSurfaceAdapter(
      () => 2,
      (content) => observedSizes.push([content.width, content.height])
    );
    const surface = adapter.createSurface(document);

    adapter.applyGeometry(surface, 0, { x: 0, y: 0, width: 80, height: 100 });
    adapter.applyGeometry(surface, 1, { x: 0, y: 100, width: 120, height: 140 });

    expect(observedSizes).toEqual([
      [300, 150],
      [160, 200]
    ]);
    expect(surface.content.width).toBe(240);
    expect(surface.content.height).toBe(280);
  });
});
