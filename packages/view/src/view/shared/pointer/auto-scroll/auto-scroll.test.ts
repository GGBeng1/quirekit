import { describe, expect, it, vi } from "vitest";
import { createMountedPointerAutoScrollController } from "./controller";
import { resolveMountedPointerAutoScrollAxisDelta } from "./delta";

describe("resolveMountedPointerAutoScrollAxisDelta", () => {
  it("accelerates toward either edge and stays idle in the center", () => {
    expect(resolveMountedPointerAutoScrollAxisDelta(100, 100, 200, 40, 40)).toBe(-24);
    expect(resolveMountedPointerAutoScrollAxisDelta(120, 100, 200, 40, 40)).toBe(-12);
    expect(resolveMountedPointerAutoScrollAxisDelta(200, 100, 200, 40, 40)).toBe(0);
    expect(resolveMountedPointerAutoScrollAxisDelta(280, 100, 200, 40, 40)).toBe(12);
    expect(resolveMountedPointerAutoScrollAxisDelta(300, 100, 200, 40, 40)).toBe(24);
  });

  it("uses independently configured edge thresholds", () => {
    expect(resolveMountedPointerAutoScrollAxisDelta(115, 100, 200, 20, 60)).toBe(-6);
    expect(resolveMountedPointerAutoScrollAxisDelta(250, 100, 200, 20, 60)).toBe(4);
    expect(resolveMountedPointerAutoScrollAxisDelta(220, 100, 200, 20, 60)).toBe(0);
  });
});

describe("createMountedPointerAutoScrollController", () => {
  it("replays the target one frame after scrolling and cancels on stop", () => {
    const root = {
      ownerDocument: { defaultView: null }
    } as unknown as HTMLElement;
    const scroller = {
      scrollLeft: 0,
      scrollTop: 10,
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 200
      })
    } as unknown as HTMLElement;
    const onScrollFrame = vi.fn();
    const cancelFrame = vi.fn();
    const scheduledFrames = new Map<number, FrameRequestCallback>();
    let nextFrameId = 0;
    const controller = createMountedPointerAutoScrollController({
      root,
      edgeThreshold: 40,
      resolveScroller: () => scroller,
      requestFrame: (callback) => {
        nextFrameId += 1;
        scheduledFrames.set(nextFrameId, callback);
        return nextFrameId;
      },
      cancelFrame,
      onScrollFrame
    });

    controller.update({ clientX: 100, clientY: 200 });
    expect(scheduledFrames.has(1)).toBe(true);

    scheduledFrames.get(1)!(0);

    expect(scroller.scrollTop).toBe(34);
    expect(onScrollFrame).not.toHaveBeenCalled();
    expect(nextFrameId).toBe(2);

    scheduledFrames.get(2)!(16);

    expect(onScrollFrame).toHaveBeenCalledWith({
      clientX: 100,
      clientY: 200
    });
    expect(scroller.scrollTop).toBe(58);
    expect(nextFrameId).toBe(3);

    controller.stop();
    expect(cancelFrame).toHaveBeenCalledWith(3);
  });

  it("does not replay selection when the scroll ancestor cannot move", () => {
    const root = {
      ownerDocument: { defaultView: null }
    } as unknown as HTMLElement;
    let scrollTop = 0;
    const scroller = {
      scrollLeft: 0,
      get scrollTop() {
        return scrollTop;
      },
      set scrollTop(_value: number) {
        scrollTop = 0;
      },
      getBoundingClientRect: () => ({
        left: 0,
        top: 0,
        width: 200,
        height: 200
      })
    } as unknown as HTMLElement;
    const onScrollFrame = vi.fn();
    let scheduledFrame: FrameRequestCallback | null = null;
    const controller = createMountedPointerAutoScrollController({
      root,
      edgeThreshold: 40,
      resolveScroller: () => scroller,
      requestFrame: (callback) => {
        scheduledFrame = callback;
        return 1;
      },
      cancelFrame: vi.fn(),
      onScrollFrame
    });

    controller.update({ clientX: 100, clientY: 200 });
    const frame = scheduledFrame as unknown as FrameRequestCallback;
    frame(0);

    expect(onScrollFrame).not.toHaveBeenCalled();
  });
});
