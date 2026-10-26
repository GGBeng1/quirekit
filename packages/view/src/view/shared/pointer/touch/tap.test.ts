// @vitest-environment happy-dom
import { describe, expect, it, vi } from "vitest";
import { bindMountedTouchTaps } from "./tap";

/** @param type - Native event name. @param x - Horizontal sample. @param primary - First finger flag. @returns Touch pointer event. */
function pointer(type: string, x = 20, primary = true): PointerEvent {
  return new PointerEvent(type, { bubbles: true, cancelable: true, pointerType: "touch", isPrimary: primary,
    pointerId: primary ? 1 : 2, button: 0, clientX: x, clientY: 20 });
}

describe("mounted touch tap ownership", () => {
  it("waits for release and leaves scrolling, multiple fingers and cancel unclaimed", () => {
    const target = document.createElement("div");
    document.body.append(target);
    const tap = vi.fn();
    const destroy = bindMountedTouchTaps({ ownerDocument: document, targets: [target], tap });
    const down = pointer("pointerdown");
    target.dispatchEvent(down);
    expect(down.defaultPrevented).toBe(false);
    expect(tap).not.toHaveBeenCalled();
    target.dispatchEvent(pointer("pointerup"));
    expect(tap).toHaveBeenCalledTimes(1);
    const end = new Event("touchend", { bubbles: true, cancelable: true });
    target.dispatchEvent(end);
    expect(end.defaultPrevented).toBe(true);
    for (const cancel of [pointer("pointermove", 40), pointer("pointercancel"), pointer("pointerdown", 20, false), new Event("scroll", { bubbles: true })]) {
      target.dispatchEvent(pointer("pointerdown"));
      target.dispatchEvent(cancel);
      target.dispatchEvent(pointer("pointerup"));
      const end = new Event("touchend", { bubbles: true, cancelable: true });
      target.dispatchEvent(end);
      expect(end.defaultPrevented).toBe(false);
    }
    expect(tap).toHaveBeenCalledTimes(1);
    destroy();
    target.dispatchEvent(pointer("pointerdown"));
    target.dispatchEvent(pointer("pointerup"));
    expect(tap).toHaveBeenCalledTimes(1);
    target.remove();
  });
});
