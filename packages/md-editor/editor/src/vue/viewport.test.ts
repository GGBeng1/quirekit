// @vitest-environment happy-dom
import { afterEach, expect, it, vi } from "vitest";
import { documentChromeMargins } from "./viewport";
afterEach(() => vi.restoreAllMocks());

it("uses the greater active obstruction and does not measure embedded dock geometry", () => {
  const dock = document.createElement("div"), task = document.createElement("div");
  document.body.append(dock, task); dock.style.position = "fixed";
  const dockRect = vi.spyOn(dock, "getBoundingClientRect").mockReturnValue({ top: innerHeight - 56, height: 56 } as DOMRect);
  const taskRect = vi.spyOn(task, "getBoundingClientRect").mockReturnValue({ top: innerHeight - 216, height: 216 } as DOMRect);
  try {
    expect(documentChromeMargins(null, dock, task)).toEqual({ top: 0, bottom: 228 });
    expect(dockRect).toHaveBeenCalledOnce(); expect(taskRect).toHaveBeenCalledOnce();
    dockRect.mockClear(); dock.style.position = "relative";
    expect(documentChromeMargins(null, dock, null)).toBeNull(); expect(dockRect).not.toHaveBeenCalled();
    expect(documentChromeMargins(null, null, null)).toBeNull();
  } finally { dock.remove(); task.remove(); }
});

it("projects chrome into the reduced visual viewport instead of adding keyboard height again", () => {
  const dock = document.createElement("div"), task = document.createElement("div"), original = Object.getOwnPropertyDescriptor(window, "visualViewport");
  document.body.append(dock, task); dock.style.position = "fixed";
  Object.defineProperty(window, "visualViewport", { configurable: true, value: { offsetTop: 50, height: 350 } });
  vi.spyOn(dock, "getBoundingClientRect").mockReturnValue({ top: 344, height: 56 } as DOMRect);
  vi.spyOn(task, "getBoundingClientRect").mockReturnValue({ top: 200, height: 200 } as DOMRect);
  try { expect(documentChromeMargins(null, dock, task)).toEqual({ top: 0, bottom: 212 }); }
  finally { original ? Object.defineProperty(window, "visualViewport", original) : Reflect.deleteProperty(window, "visualViewport"); dock.remove(); task.remove(); }
});
