import { describe, expect, it, vi } from "vitest";
import { createMountedPointerSelectionRenderer } from "./selection-render";

describe("mounted pointer selection rendering", () => {
  it("checks committed state after flushing and avoids a second request", () => {
    const calls: string[] = [];
    let current = false;
    const render = createMountedPointerSelectionRenderer(
      () => {
        calls.push("flush");
        current = true;
      },
      () => {
        calls.push("read-current");
        return current;
      },
      () => calls.push("request")
    );

    render("flush-pending");
    expect(calls).toEqual(["flush", "read-current"]);
  });

  it("requests missing or stale presentation after a direct-view dispatch", () => {
    const calls: string[] = [];
    const render = createMountedPointerSelectionRenderer(
      () => calls.push("flush"),
      () => {
        calls.push("read-current");
        return false;
      },
      () => calls.push("request")
    );

    render("flush-pending");
    expect(calls).toEqual(["flush", "read-current", "request"]);
  });

  it("preserves local refreshes even when editor state is already presented", () => {
    const flush = vi.fn();
    const isCurrent = vi.fn(() => true);
    const request = vi.fn();
    const render = createMountedPointerSelectionRenderer(flush, isCurrent, request);

    render("request");
    render();
    expect(request).toHaveBeenCalledTimes(2);
    expect(flush).not.toHaveBeenCalled();
    expect(isCurrent).not.toHaveBeenCalled();
  });

  it("does not issue fallback work after a failed flush", () => {
    const failure = new Error("render failed");
    const isCurrent = vi.fn();
    const request = vi.fn();
    const render = createMountedPointerSelectionRenderer(
      () => { throw failure; },
      isCurrent,
      request
    );

    expect(() => render("flush-pending")).toThrow(failure);
    expect(isCurrent).not.toHaveBeenCalled();
    expect(request).not.toHaveBeenCalled();
  });
});
