import { describe, expect, it } from "vitest";
import {
  resolveCanvasViewRenderStrategy,
  runCanvasViewRenderSchedule
} from "./scheduler";
import type { CanvasViewRenderExecutor } from "./types";
import type {
  QuireViewRenderOptions,
  QuireViewRenderResult,
  QuireViewSelectionUpdateResult
} from "../types";

const emptyRenderResult = {
  layoutSnapshot: {},
  selectionGeometry: {},
  displayList: { commands: [] },
  contentDisplayList: { commands: [] },
  overlayDisplayList: { commands: [] },
  domOverlays: []
} as unknown as QuireViewRenderResult;

describe("Canvas view render scheduler", () => {
  it("chooses a full render when no previous render result exists", () => {
    expect(
      resolveCanvasViewRenderStrategy({
        reason: "selection"
      })
    ).toBe("full");
  });

  it("chooses a selection update only for selection changes with previous artifacts", () => {
    expect(
      resolveCanvasViewRenderStrategy({
        reason: "selection",
        previousRenderResult: emptyRenderResult
      })
    ).toBe("selection-update");
    expect(
      resolveCanvasViewRenderStrategy({
        reason: "composition",
        previousRenderResult: emptyRenderResult
      })
    ).toBe("full");
  });

  it("runs a full render for non-selection update reasons", () => {
    const executor = new SpyRenderExecutor();
    const result = runCanvasViewRenderSchedule({
      view: executor,
      reason: "transaction",
      previousRenderResult: emptyRenderResult,
      renderOptions: createRenderOptions()
    });

    expect(result.strategy).toBe("full");
    expect(result.renderResult).toBe(executor.fullRenderResult);
    expect(result.selectionUpdateResult).toBeUndefined();
    expect(executor.calls).toEqual(["render"]);
  });

  it("runs a selection update when previous artifacts are available", () => {
    const executor = new SpyRenderExecutor();
    const result = runCanvasViewRenderSchedule({
      view: executor,
      reason: "selection",
      previousRenderResult: emptyRenderResult,
      renderOptions: createRenderOptions()
    });

    expect(result.strategy).toBe("selection-update");
    expect(result.renderResult).toBe(executor.selectionRenderResult);
    expect(result.selectionUpdateResult).toBe(executor.selectionRenderResult);
    expect(executor.calls).toEqual(["selection"]);
  });
});

class SpyRenderExecutor implements CanvasViewRenderExecutor {
  readonly calls: string[] = [];
  readonly fullRenderResult = {
    ...emptyRenderResult,
    displayList: { commands: [{ id: "full" }] }
  } as unknown as QuireViewRenderResult;
  readonly selectionRenderResult = {
    ...emptyRenderResult,
    displayList: { commands: [{ id: "selection" }] },
    invalidationPlan: { viewportRects: [] }
  } as unknown as QuireViewSelectionUpdateResult;

  render(options: QuireViewRenderOptions): QuireViewRenderResult {
    void options;
    this.calls.push("render");

    return this.fullRenderResult;
  }

  renderSelectionUpdate(): QuireViewSelectionUpdateResult {
    this.calls.push("selection");

    return this.selectionRenderResult;
  }
}

function createRenderOptions(): QuireViewRenderOptions {
  return {
    viewportRect: { x: 0, y: 0, width: 100, height: 40 },
    target: {} as QuireViewRenderOptions["target"]
  };
}
