import { describe, expect, it, vi } from "vitest";
import { trackContextMenuRegion } from "./anchor";

/** @returns A movable region and deterministic viewport event/frame sources. */
function regionFixture() {
  const document = new EventTarget();
  const viewport = new EventTarget();
  const visualViewport = new EventTarget();
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  const bounds = { left: 40, bottom: 900 };
  const window = Object.assign(viewport, {
    visualViewport,
    requestAnimationFrame: (callback: FrameRequestCallback) => {
      frames.set(++nextFrame, callback);
      return nextFrame;
    },
    cancelAnimationFrame: (id: number) => { frames.delete(id); }
  });
  const target = {
    ownerDocument: Object.assign(document, { defaultView: window }),
    isConnected: true,
    getBoundingClientRect: () => bounds
  } as unknown as HTMLElement;
  return { target, bounds, document, viewport, visualViewport, frames };
}

describe("ContextMenu live region anchor", () => {
  it("reads current geometry after focus scrolling and coalesces viewport updates", () => {
    const fixture = regionFixture();
    const reposition = vi.fn();
    const stop = trackContextMenuRegion(fixture.target, reposition);
    expect(reposition).toHaveBeenCalledTimes(1);
    const getAnchorRect = reposition.mock.calls[0]![0] as () => object;
    expect(getAnchorRect()).toEqual({ x: 40, y: 900, width: 0, height: 0 });

    fixture.bounds.bottom = 507;
    // The callback itself is live, including deferred calculations requested before scrolling finished.
    expect(getAnchorRect()).toEqual({ x: 40, y: 507, width: 0, height: 0 });
    fixture.document.dispatchEvent(new Event("scroll"));
    fixture.viewport.dispatchEvent(new Event("resize"));
    fixture.visualViewport.dispatchEvent(new Event("scroll"));
    expect(fixture.frames.size).toBe(1);
    const callback = [...fixture.frames.values()][0]!;
    fixture.frames.clear();
    callback(16);
    expect(reposition).toHaveBeenCalledTimes(2);
    expect((reposition.mock.calls[1]![0] as () => object)()).toEqual({ x: 40, y: 507, width: 0, height: 0 });
    stop();
  });

  it("cancels pending work and removes tracking when the menu closes", () => {
    const fixture = regionFixture();
    const reposition = vi.fn();
    const stop = trackContextMenuRegion(fixture.target, reposition);
    fixture.document.dispatchEvent(new Event("scroll"));
    expect(fixture.frames.size).toBe(1);
    stop();
    expect(fixture.frames.size).toBe(0);
    fixture.document.dispatchEvent(new Event("scroll"));
    fixture.viewport.dispatchEvent(new Event("resize"));
    fixture.visualViewport.dispatchEvent(new Event("resize"));
    expect(fixture.frames.size).toBe(0);
    expect(reposition).toHaveBeenCalledTimes(1);
  });
});
