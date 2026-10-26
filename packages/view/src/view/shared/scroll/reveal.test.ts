import { describe, expect, it } from "vitest";
import type { QuireMountedEditorView } from "../types";
import { createMountedViewRevealer } from "./reveal";
import type { MountedViewScrollRect } from "./types";

/**
 * Builds a view whose root sits in one 400px scrollport.
 * @returns View, scrollport and a mutable document.
 */
function createView() {
  const ownerDocument = { defaultView: { getComputedStyle: () => ({ position: "static" }) }, body: null, documentElement: null };
  const element = (parentNode: unknown, height: number) => ({
    nodeType: 1, parentNode, ownerDocument, scrollTop: 0, scrollLeft: 0, clientWidth: 800, clientHeight: height,
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height })
  });
  const scrollport = element(null, 400);
  // The editor root is content, not a scroll container: it keeps its offset at zero.
  const root = Object.defineProperties(element(scrollport, 10_000), {
    scrollTop: { get: () => 0, set: () => {} }, scrollLeft: { get: () => 0, set: () => {} }
  });
  const state = { doc: {} };
  const view = { elements: { root }, someProp: () => undefined, state } as unknown as QuireMountedEditorView;
  return { view, scrollport, state };
}

/**
 * @param top - Rectangle top relative to the scrolled content.
 * @param scrollport - Scroll container, whose offset shifts client coordinates.
 * @returns Client rectangle 20px tall.
 */
function at(top: number, scrollport: { scrollTop: number }): MountedViewScrollRect {
  return { left: 10, right: 20, top: top - scrollport.scrollTop, bottom: top + 20 - scrollport.scrollTop };
}

describe("range reveal", () => {
  it("scrolls once with precise geometry", () => {
    const { view, scrollport } = createView();
    const revealer = createMountedViewRevealer(view, {
      resolveRangeRect: () => at(2000, scrollport), resolvePageRect: () => null, onGeometryUpdate: () => () => {}
    });
    expect(revealer.reveal({ from: 5, to: 5 }, { block: "start", margin: 24 })).toBe(true);
    expect(scrollport.scrollTop).toBe(2000 - 24);
  });

  it("scrolls to an unrendered page, then aligns precisely once it renders", () => {
    const { view, scrollport } = createView();
    let rendered = false;
    let notify = () => {};
    const revealer = createMountedViewRevealer(view, {
      resolveRangeRect: () => rendered ? at(5300, scrollport) : null,
      resolvePageRect: () => at(5000, scrollport),
      onGeometryUpdate: listener => { notify = listener; return () => { notify = () => {}; }; }
    });

    expect(revealer.reveal({ from: 900, to: 900 }, { block: "center" })).toBe(true);
    expect(scrollport.scrollTop).toBe(5010 - 200);
    rendered = true;
    notify();
    expect(scrollport.scrollTop).toBe(5310 - 200);
    scrollport.scrollTop = 0;
    notify();
    expect(scrollport.scrollTop).toBe(0);
  });

  it("stops refining after a document change, a newer request or repeated misses", () => {
    const { view, scrollport, state } = createView();
    let listeners = 0;
    let notify = () => {};
    const revealer = createMountedViewRevealer(view, {
      resolveRangeRect: () => null,
      resolvePageRect: () => at(5000, scrollport),
      onGeometryUpdate: listener => { listeners += 1; notify = listener; return () => { listeners -= 1; }; }
    });

    revealer.reveal({ from: 900, to: 900 }, {});
    notify(); notify(); notify();
    expect(listeners).toBe(0);
    revealer.reveal({ from: 900, to: 900 }, {});
    state.doc = {};
    notify();
    expect(listeners).toBe(0);
    revealer.reveal({ from: 900, to: 900 }, {});
    revealer.reveal({ from: 901, to: 901 }, {});
    expect(listeners).toBe(1);
  });

  it("reports a pending refinement only while the document is unchanged", () => {
    const { view, scrollport, state } = createView();
    const revealer = createMountedViewRevealer(view, {
      resolveRangeRect: () => null, resolvePageRect: () => at(5000, scrollport), onGeometryUpdate: () => () => {}
    });
    revealer.reveal({ from: 900, to: 900 }, {});
    expect(revealer.pending).toBe(true);
    state.doc = {};
    expect(revealer.pending).toBe(false);
  });
});
