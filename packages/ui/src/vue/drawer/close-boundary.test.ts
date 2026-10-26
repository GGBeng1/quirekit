import { describe, expect, it, vi } from "vitest";
import { createDrawerCloseBoundary } from "./close-boundary";

describe("Drawer close requests", () => {
  it.each(["close-trigger", "trigger", "escape", "outside", "swipe", "action", "cancel", "programmatic"] as const)(
    "allows the %s entry to preserve an open task before any model or focus transition", reason => {
      let open = true;
      const close = vi.fn(() => { open = false; });
      const notify = vi.fn(request => request.preventDefault());
      const boundary = createDrawerCloseBoundary({ isOpen: () => open, close, notify });

      expect(boundary.requestClose(reason)).toBe(false);
      expect(notify.mock.calls[0]?.[0]).toMatchObject({ reason, defaultPrevented: true });
      expect(close).not.toHaveBeenCalled();
      expect(open).toBe(true);
    }
  );

  it("accepts once and ignores reentrant callbacks and later exit notifications", () => {
    let open = true;
    const close = vi.fn(() => { open = false; });
    const notify = vi.fn(() => { expect(boundary.requestClose("cancel")).toBe(false); });
    const boundary = createDrawerCloseBoundary({ isOpen: () => open, close, notify });
    expect(boundary.requestClose("action")).toBe(true);
    expect(boundary.requestClose("swipe")).toBe(false);
    expect(close).toHaveBeenCalledTimes(1);
    expect(notify).toHaveBeenCalledTimes(1);
  });

  it("allows recovery after a rejected request and keeps host authority intact", () => {
    let open = true;
    let dirty = true;
    const close = vi.fn(() => { open = false; });
    const boundary = createDrawerCloseBoundary({
      isOpen: () => open, close,
      notify(request) {
        if (dirty) request.preventDefault();
        else open = false;
      }
    });
    expect(boundary.requestClose()).toBe(false);
    dirty = false;
    expect(boundary.requestClose()).toBe(true);
    expect(close).not.toHaveBeenCalled();
    expect(open).toBe(false);
  });
});
