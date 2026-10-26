import { describe, expect, it, vi } from "vitest";
import { measureQuireTableCellBlockFlow } from "./measure";

describe("measureQuireTableCellBlockFlow", () => {
  it("collects width-dependent children before delegating canonical flow", () => {
    const collectChildren = vi.fn(() => [{
      id: "paragraph",
      range: { from: 2, to: 8 }
    }]);
    const layoutContainer = vi.fn((request) => ({
      rect: { ...request.rect, height: request.children.length * 24 }
    }));
    const result = measureQuireTableCellBlockFlow({
      cellId: "cell-0-0",
      range: { from: 2, to: 8 },
      contentRect: { x: 10, y: 20, width: 120, height: 0 },
      blockHeight: 24,
      content: { collectChildren },
      layoutContainer
    });

    expect(collectChildren).toHaveBeenCalledWith({
      contentRect: { x: 10, y: 20, width: 120, height: 0 }
    });
    expect(layoutContainer).toHaveBeenCalledWith({
      id: "cell-0-0:measure",
      range: { from: 2, to: 8 },
      rect: { x: 10, y: 20, width: 120, height: 0 },
      blockHeight: 24,
      blockGap: 0,
      children: [{ id: "paragraph", range: { from: 2, to: 8 } }]
    });
    expect(result).toEqual({
      height: 24,
      children: [{ id: "paragraph", range: { from: 2, to: 8 } }]
    });
  });
});
