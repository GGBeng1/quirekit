import { describe, expect, it, vi } from "vitest";
import type { QuireViewRenderResult } from "../../types";
import { createMountedPaginatedGeometryFacade } from "./geometry";

/** @returns A presented caret with a shifted, scaled document surface. */
function fixture() {
  let result = { selectionGeometry: { carets: [{ pos: 15, rect: { x: 120, y: 240, width: 1, height: 30 } }] } } as unknown as QuireViewRenderResult | undefined;
  const surface = { clientRect: { left: 20, top: -40, width: 400, height: 600 },
    surfaceBounds: { x: 100, y: 200, width: 800, height: 1200 } };
  const readSelectionContext = vi.fn(() => { throw new Error("Presented carets already own their visual occurrence"); });
  const readSurface = vi.fn(() => surface);
  const facade = createMountedPaginatedGeometryFacade({ backendLabel: "Test", readRenderResult: () => result,
    readSurface, readSelectionContext });
  return { facade, surface, readSurface, readSelectionContext, clear: () => { result = undefined; },
    range: () => { result = { selectionGeometry: { carets: [] } } as unknown as QuireViewRenderResult; } };
}

describe("presented caret client projection", () => {
  it("uses frame geometry and current surface scale and scroll without querying canonical selection", () => {
    const f = fixture();
    expect(f.facade.getCaretRect()).toEqual({ left: 30, right: 30.5, top: -20, bottom: -5 });
    f.surface.clientRect.top -= 60;
    expect(f.facade.getCaretRect()).toEqual({ left: 30, right: 30.5, top: -80, bottom: -65 });
    expect(f.readSurface).toHaveBeenCalledTimes(2);
    expect(f.readSelectionContext).not.toHaveBeenCalled();
  });

  it("returns no guessed caret without a frame or when the frame has a range", () => {
    const f = fixture();
    f.range();
    expect(f.facade.getCaretRect()).toBeNull();
    f.clear();
    expect(f.facade.getCaretRect()).toBeNull();
    expect(f.readSurface).not.toHaveBeenCalled();
  });
});
