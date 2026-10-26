import { afterEach, describe, expect, it, vi } from "vitest";
import type { ClassicEditorShellRegions } from "../types";
import { createClassicEditorStageController } from "./controller";

/** @returns Minimal browser geometry and a deterministic frame queue. */
function createStage() {
  let resize!: () => void;
  let nextFrame = 1;
  const frames = new Map<number, FrameRequestCallback>();
  const disconnect = vi.fn();
  vi.stubGlobal("ResizeObserver", class {
    /** @param callback - Observer notification. */
    constructor(callback: () => void) { resize = callback; }
    observe = vi.fn();
    disconnect = disconnect;
  });
  vi.stubGlobal("requestAnimationFrame", (callback: FrameRequestCallback) => {
    const id = nextFrame++;
    frames.set(id, callback);
    return id;
  });
  vi.stubGlobal("cancelAnimationFrame", (id: number) => frames.delete(id));
  const viewport = Object.assign(new EventTarget(), {
    clientWidth: 1239, clientHeight: 850, scrollWidth: 1239, scrollTop: 1400, scrollLeft: 0,
    dataset: {} as Record<string, string>
  });
  const root = { dataset: { layout: "desktop" } };
  const style = { setProperty: vi.fn(), removeProperty: vi.fn() };
  const canvasStyle = { setProperty: vi.fn() };
  const mountRect = { left: 0, top: 0, width: 1000 };
  const rail = { hidden: true };
  const listener = vi.fn();
  const controller = createClassicEditorStageController({
    root, workspaceViewport: viewport, documentScrollContent: { style },
    canvasMount: { style: canvasStyle, getBoundingClientRect: () => mountRect },
    ruler: new EventTarget(), workspaceToolbar: Object.assign(new EventTarget(), { style }), documentSidebar: rail
  } as unknown as ClassicEditorShellRegions, listener);
  const bounds = { x: 0, y: 0, width: 1000, height: 4800 };
  const pages = [0, 1600, 3200].map(y => ({ pageRect: { x: 0, y, width: 1000, height: 1400 } }));
  /** Runs only the callbacks already queued for this browser frame. */
  const flush = () => {
    const pending = [...frames.values()];
    frames.clear();
    pending.forEach(callback => callback(0));
  };
  return { controller, root, viewport, listener, style, canvasStyle, mountRect, bounds, pages, rail, frames, flush, disconnect, resize: () => resize() };
}

afterEach(() => vi.unstubAllGlobals());

describe("Classic automatic zoom stage lifecycle", () => {
  it("keeps deliberate rail panning when a stale overlay temporarily extends the resized scroll range", () => {
    const { controller, viewport, style, rail, bounds, pages, flush, resize } = createStage();
    const properties = new Map<string, number>();
    let overlayOverflow = 0;
    style.setProperty.mockImplementation((name: string, value: string) => { properties.set(name, parseFloat(value)); });
    Object.defineProperty(viewport, "scrollWidth", { get: () => Math.max(viewport.clientWidth,
      (properties.get("--qk-classic-stage-start") ?? 0) + (properties.get("--qk-classic-stage-width") ?? 0) + 240 + overlayOverflow) });
    rail.hidden = false;
    controller.setDocumentLayout(bounds, pages); flush();
    viewport.clientWidth = 938;
    overlayOverflow = 480;
    resize(); flush();
    // The connector settles after the stage. User scrolling now uses the real column extent.
    overlayOverflow = 0;
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    viewport.dispatchEvent(new Event("scroll"));
    controller.schedule(); flush();
    expect(viewport.scrollLeft).toBe(302);
    controller.destroy();
  });

  it("retains the paper center through rail visibility, resize and scale, without undoing deliberate panning", () => {
    const { controller, viewport, style, rail, bounds, pages, frames, flush, resize } = createStage();
    const properties = new Map<string, number>();
    style.setProperty.mockImplementation((name: string, value: string) => { properties.set(name, parseFloat(value)); });
    Object.defineProperty(viewport, "scrollWidth", { get: () => Math.max(viewport.clientWidth,
      (properties.get("--qk-classic-stage-start") ?? 0) + (properties.get("--qk-classic-stage-width") ?? 0) + (rail.hidden ? 0 : 240)) });
    viewport.clientWidth = 938;
    rail.hidden = false;
    controller.setDocumentLayout(bounds, pages);
    flush();
    expect(viewport.scrollLeft).toBe(31);
    rail.hidden = true;
    controller.schedule(); flush();
    expect(viewport.scrollLeft).toBe(31);
    rail.hidden = false;
    controller.schedule(); flush();
    expect(viewport.scrollLeft).toBe(31);
    viewport.clientWidth = 1239;
    resize(); flush();
    expect(viewport.scrollLeft).toBe(0);
    expect(properties.get("--qk-classic-stage-start")).toBe(71.5);
    // Vertical native scrolling must not turn centered reading into rail navigation.
    style.setProperty.mockClear();
    viewport.scrollTop += 100;
    viewport.dispatchEvent(new Event("scroll"));
    expect(frames.size).toBe(0);
    expect(style.setProperty).not.toHaveBeenCalled();
    controller.setZoom(150, "manual"); flush();
    expect(viewport.scrollLeft).toBe(130.5);
    viewport.scrollLeft = viewport.scrollWidth - viewport.clientWidth;
    style.setProperty.mockClear();
    viewport.dispatchEvent(new Event("scroll"));
    expect(style.setProperty).toHaveBeenCalledExactlyOnceWith("--qk-classic-workspace-scroll-left", `${viewport.scrollLeft}px`);
    viewport.dispatchEvent(new Event("scroll"));
    expect(style.setProperty).toHaveBeenCalledTimes(1);
    viewport.clientWidth = 938;
    resize(); flush();
    expect(viewport.scrollLeft).toBe(viewport.scrollWidth - viewport.clientWidth);
    controller.destroy();
  });

  it("projects a pinch anchor from the centered paper origin", () => {
    const { controller, viewport, bounds, pages, flush } = createStage();
    controller.setDocumentLayout(bounds, pages);
    flush();
    // The paper begins at (1239 - 1000) / 2, independently of product gutters.
    controller.setZoomAnchor(619.5, 200);
    viewport.scrollWidth = 1500;
    controller.setZoom(150, "manual"); flush();
    expect(viewport.scrollLeft).toBe(130.5);
    controller.destroy();
  });

  it("admits only visible paper using the actual zoomed and scrolled mount", () => {
    const fixture = createStage();
    const { controller: stage, bounds, pages, viewport, mountRect } = fixture;
    const clip = { left: 0, right: 1200, top: 200, bottom: 1000 };
    Object.assign(viewport, { getBoundingClientRect: () => clip });
    // Bind an independently positioned host to cover both zoom and native scroll.
    Object.assign(mountRect, { left: 300, top: -150, width: 500 });
    expect(stage.containsPagePoint(301, 201)).toBe(false);
    expect(stage.readPageRect(201)).toBeUndefined();
    stage.setDocumentLayout(bounds, pages);
    expect(stage.readPageRect(201)).toEqual({ x: 300, y: -150, width: 500, height: 700 });
    expect(stage.containsPagePoint(301, 201)).toBe(true);
    expect(stage.containsPagePoint(299, 300)).toBe(false);
    expect(stage.containsPagePoint(801, 300)).toBe(false);
    expect(stage.containsPagePoint(400, 199)).toBe(false);
    expect(stage.containsPagePoint(400, 600)).toBe(false);
    expect(stage.containsPagePoint(400, 651)).toBe(true);
    mountRect.top -= 100;
    expect(stage.readPageRect(551)).toEqual({ x: 300, y: 550, width: 500, height: 700 });
    expect(stage.containsPagePoint(400, 500)).toBe(false);
    expect(stage.containsPagePoint(400, 551)).toBe(true);
    stage.setDocumentLayout(bounds, []);
    expect(stage.readPageRect(551)).toBeUndefined();
    expect(stage.containsPagePoint(400, 551)).toBe(false);
    stage.setDocumentLayout(bounds, undefined);
    expect(stage.containsPagePoint(400, 500)).toBe(true);
    stage.destroy();
    expect(stage.readPageRect(551)).toBeUndefined();
    expect(stage.containsPagePoint(400, 551)).toBe(false);
  });

  it("locks a compact fitted body without adding work to native scrolling and unlocks wider reading", () => {
    const { controller, root, bounds, viewport, canvasStyle, flush, listener, frames } = createStage();
    root.dataset.layout = "compact";
    viewport.clientWidth = 440;
    viewport.scrollWidth = 750;
    viewport.scrollTop = 0;
    let reads = 0;
    const body = { x: 200, y: 80, width: 552, height: 1100 };
    controller.setDocumentLayout(bounds, [{ pageRect: { x: 0, y: 0, width: 1000, height: 1400 }, get bodyRect() { reads++; return body; } }]);
    controller.setZoom(100, "fit-content");
    flush();
    expect(viewport.dataset.scrollAxis).toBe("y");
    const centered = viewport.scrollLeft;
    expect(centered).toBe(0);
    expect(canvasStyle.setProperty).toHaveBeenCalledWith("--qk-classic-body-offset", `${-137 / 0.75}px`);
    reads = 0;
    listener.mockClear();
    for (let index = 0; index < 100; index++) {
      viewport.scrollTop += 4;
      viewport.dispatchEvent(new Event("scroll"));
    }
    expect(viewport.scrollLeft).toBe(centered);
    expect(frames.size).toBe(0);
    expect(reads).toBe(0);
    expect(listener).not.toHaveBeenCalled();
    controller.setZoomAnchor(170, 240);
    controller.setZoom(100, "manual");
    flush();
    expect(viewport.dataset.scrollAxis).toBe("both");
    expect(viewport.scrollLeft + 170).toBeCloseTo((137 + 170) / 0.75);
    controller.setZoom(75, "fit-content");
    flush();
    expect(viewport.scrollLeft).toBe(centered);
    expect(viewport.dataset.scrollAxis).toBe("y");
    root.dataset.layout = "desktop";
    controller.schedule();
    flush();
    expect(viewport.dataset.scrollAxis).toBe("both");
    controller.destroy();
    expect(viewport.dataset.scrollAxis).toBeUndefined();
  });

  it("keeps an oversized body horizontally reachable at the minimum zoom", () => {
    const { controller, root, viewport, flush } = createStage();
    root.dataset.layout = "compact";
    viewport.clientWidth = 440;
    controller.setDocumentLayout({ x: 0, y: 0, width: 3000, height: 1400 }, [{
      pageRect: { x: 0, y: 0, width: 3000, height: 1400 }, bodyRect: { x: 100, y: 80, width: 2800, height: 1100 }
    }]);
    controller.setZoom(100, "fit-content");
    flush();
    expect(viewport.dataset.scrollAxis).toBe("both");
    controller.destroy();
  });

  it("centers the body and retains a pinch midpoint in document coordinates", () => {
    const { controller, bounds, viewport, flush, listener } = createStage();
    viewport.clientWidth = 440;
    viewport.scrollWidth = 750;
    viewport.scrollTop = 0;
    controller.setDocumentLayout(bounds, [{ pageRect: { x: 0, y: 0, width: 1000, height: 1400 }, bodyRect: { x: 200, y: 80, width: 552, height: 1100 } }]);
    controller.setZoom(100, "fit-content");
    flush();
    expect(listener).toHaveBeenLastCalledWith(75, "fit-content");
    expect(viewport.scrollLeft).toBeCloseTo(137);
    const x = (viewport.scrollLeft + 170) / 0.75;
    const y = (viewport.scrollTop + 240) / 0.75;
    controller.setZoomAnchor(170, 240);
    controller.setZoom(100, "manual");
    flush();
    expect(viewport.scrollLeft + 170).toBeCloseTo(x);
    expect(viewport.scrollTop + 240).toBeCloseTo(y);
    controller.destroy();
  });
  it("coalesces automatic measurements, centers one page, and leaves deliberate scroll alone", () => {
    const fixture = createStage();
    const { controller, bounds, pages, viewport, flush, listener, frames } = fixture;
    controller.setDocumentLayout(bounds, pages);
    controller.setZoom(100, "fit-page");
    for (let index = 0; index < 100; index++) fixture.resize();
    expect(frames.size).toBe(1);
    flush();
    expect(listener).toHaveBeenLastCalledWith(58, "fit-page");
    expect(viewport.scrollTop).toBeCloseTo(2300 * 0.58 - 425);
    controller.setZoom(58, "fit-page");
    flush();
    listener.mockClear();
    viewport.scrollTop = 999;
    viewport.dispatchEvent(new Event("scroll"));
    expect(frames.size).toBe(0);
    controller.setDocumentLayout(bounds, pages);
    controller.schedule();
    flush();
    expect(viewport.scrollTop).toBe(999);
    expect(listener).not.toHaveBeenCalled();
    controller.destroy();
  });

  it("never scans pages for width fit and reuses page height through selection-only updates", () => {
    const { controller, bounds, flush, pages } = createStage();
    let reads = 0;
    const measured = pages.map(page => ({ get pageRect() { reads++; return page.pageRect; } }));
    controller.setDocumentLayout(bounds, measured);
    controller.setZoom(100, "fit-width");
    flush();
    expect(reads).toBe(0);
    controller.setZoom(100, "fit-page");
    flush();
    controller.setZoom(58, "fit-page");
    flush();
    reads = 0;
    for (let index = 0; index < 30; index++) {
      controller.setDocumentLayout(bounds, measured);
      controller.schedule();
      flush();
    }
    expect(reads).toBe(0);
    controller.destroy();
  });

  it("uses the same reserved rail for fitting and ignores stale work after destruction", () => {
    const fixture = createStage();
    fixture.rail.hidden = false;
    fixture.controller.setDocumentLayout(fixture.bounds, fixture.pages);
    fixture.controller.setZoom(100, "fit-width");
    fixture.flush();
    expect(fixture.listener).toHaveBeenLastCalledWith(89, "fit-width");
    fixture.viewport.clientWidth = 1000;
    fixture.resize();
    fixture.controller.setZoom(75, "manual");
    fixture.flush();
    expect(fixture.canvasStyle.setProperty).toHaveBeenCalledWith("zoom", "0.75");
    fixture.listener.mockClear();
    fixture.resize();
    fixture.controller.destroy();
    fixture.resize();
    fixture.controller.schedule();
    fixture.flush();
    expect(fixture.frames.size).toBe(0);
    expect(fixture.listener).not.toHaveBeenCalled();
    expect(fixture.disconnect).toHaveBeenCalledOnce();
  });
});
