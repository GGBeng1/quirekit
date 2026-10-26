import { describe, expect, it, vi } from "vitest";
import {
  bindMountedResizeEvents,
  createMountedViewCleanupRegistry,
  resolveMountedViewUpdateScheduleMode
} from ".";

describe("mounted view lifecycle", () => {
  it("destroys registered resources once in reverse ownership order", () => {
    const order: string[] = [];
    const cleanup = createMountedViewCleanupRegistry();

    cleanup.add(() => order.push("surface"));
    cleanup.add(() => order.push("pointer"));
    cleanup.destroy();
    cleanup.destroy();

    expect(order).toEqual(["pointer", "surface"]);
  });

  it("releases resize observers and browser listeners through one cleanup", () => {
    const onResize = vi.fn();
    const disconnect = vi.fn();
    const observe = vi.fn();
    const addEventListener = vi.fn();
    const removeEventListener = vi.fn();
    class FakeResizeObserver {
      /** Creates a fake observer for the lifecycle test. */
      constructor(_callback: ResizeObserverCallback) {}

      /** Records the observed geometry element. */
      observe(element: Element): void {
        observe(element);
      }

      /** Records observer teardown. */
      disconnect(): void {
        disconnect();
      }
    }
    const ownerWindow = {
      ResizeObserver: FakeResizeObserver,
      addEventListener,
      removeEventListener
    };
    const root = {
      ownerDocument: { defaultView: ownerWindow }
    } as unknown as HTMLElement;
    const observedElement = {} as Element;
    const cleanup = bindMountedResizeEvents({
      root,
      observedElement,
      onResize
    });

    expect(observe).toHaveBeenCalledWith(observedElement);
    expect(addEventListener).toHaveBeenCalledWith("resize", onResize);

    cleanup();

    expect(disconnect).toHaveBeenCalledOnce();
    expect(removeEventListener).toHaveBeenCalledWith("resize", onResize);
  });

  it("coalesces only focused transaction and composition updates", () => {
    expect(resolveMountedViewUpdateScheduleMode({
      reason: "transaction",
      focused: true
    })).toBe("frame");
    expect(resolveMountedViewUpdateScheduleMode({
      reason: "composition",
      focused: true
    })).toBe("frame");
    expect(resolveMountedViewUpdateScheduleMode({
      reason: "selection",
      focused: true
    })).toBe("sync");
    expect(resolveMountedViewUpdateScheduleMode({
      reason: "transaction",
      focused: false
    })).toBe("sync");
  });
});
