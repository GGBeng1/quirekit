import { afterEach, describe, expect, it, vi } from "vitest";
import { createQuireDevtoolsRecorder } from "../recorder";
import type { QuireDevtoolsRenderSummary } from "../types";
import { QuireDevtoolsInteractionTraceManager } from "./trace";

describe("QuireDevtoolsInteractionTraceManager", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it("settles an interaction after the next render frame", () => {
    vi.useFakeTimers();
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const manager = new QuireDevtoolsInteractionTraceManager({ recorder });

    manager.start({
      source: "beforeinput",
      label: "insertText",
      target: "textarea"
    });
    now = 2;
    const operationToken = recorder.startOperation({ source: "transaction" });
    now = 3;
    const operationEntry = recorder.finishOperation(operationToken);
    now = 4;
    const renderEntry = recorder.recordRender(createRenderSummary());
    now = 24;
    manager.settleAfterRender(renderEntry);
    vi.runOnlyPendingTimers();

    expect(recorder.getEntries()).toEqual([
      expect.objectContaining({ kind: "operation" }),
      expect.objectContaining({ kind: "render" }),
      expect.objectContaining({
        kind: "interaction",
        settled: true,
        durationMs: 24,
        operationCount: 1,
        renderCount: 1,
        operationEntryIds: [operationEntry?.id],
        renderEntryIds: [renderEntry?.id],
        renderEntryId: renderEntry?.id
      })
    ]);
  });

  it("records an unsettled interaction when no render arrives", () => {
    vi.useFakeTimers();
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const manager = new QuireDevtoolsInteractionTraceManager({
      recorder,
      timeoutMs: 50
    });

    manager.start({
      source: "pointerdown",
      label: "click to caret",
      target: "canvas"
    });
    now = 51;
    vi.advanceTimersByTime(50);

    expect(recorder.getEntries()).toEqual([
      expect.objectContaining({
        kind: "interaction",
        settled: false,
        durationMs: 51,
        renderCount: 0,
        operationEntryIds: [],
        renderEntryIds: []
      })
    ]);
  });

  it("keeps overlapping interactions from accumulating later operation entries", () => {
    vi.useFakeTimers();
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const manager = new QuireDevtoolsInteractionTraceManager({ recorder });

    manager.start({ source: "beforeinput", label: "first" });
    now = 1;
    const firstOperation = recorder.finishOperation(
      recorder.startOperation({ source: "first-operation" })
    );
    now = 2;
    manager.start({ source: "beforeinput", label: "second" });
    now = 3;
    const secondOperation = recorder.finishOperation(
      recorder.startOperation({ source: "second-operation" })
    );
    now = 4;
    const renderEntry = recorder.recordRender(createRenderSummary());
    manager.settleAfterRender(renderEntry);
    now = 20;
    vi.runOnlyPendingTimers();

    const interactions = recorder.getEntries().filter(
      (entry) => entry.kind === "interaction"
    );

    expect(interactions).toEqual([
      expect.objectContaining({
        label: "first",
        operationCount: 1,
        operationEntryIds: [firstOperation?.id],
        renderEntryIds: [renderEntry?.id]
      }),
      expect.objectContaining({
        label: "second",
        operationCount: 1,
        operationEntryIds: [secondOperation?.id],
        renderEntryIds: [renderEntry?.id]
      })
    ]);
  });

  it("keeps every render observed before one interaction settles", () => {
    vi.useFakeTimers();
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const manager = new QuireDevtoolsInteractionTraceManager({ recorder });

    manager.start({ source: "beforeinput", label: "insertText" });
    now = 1;
    const firstRender = recorder.recordRender(createRenderSummary());
    manager.settleAfterRender(firstRender);
    now = 2;
    const secondRender = recorder.recordRender(createRenderSummary());
    manager.settleAfterRender(secondRender);
    now = 20;
    vi.runOnlyPendingTimers();

    expect(recorder.getEntries().at(-1)).toEqual(
      expect.objectContaining({
        kind: "interaction",
        renderCount: 2,
        renderEntryIds: [firstRender?.id, secondRender?.id],
        renderEntryId: firstRender?.id
      })
    );
  });
});

/**
 * Creates a minimal render summary for interaction trace tests.
 *
 * @returns Render summary fixture.
 */
function createRenderSummary(): QuireDevtoolsRenderSummary {
  return {
    viewId: "primary",
    mode: "canvas",
    strategy: "full",
    commandCount: 1,
    blockCount: 1,
    caretCount: 1,
    selectionRangeCount: 0,
    overlayCount: 0,
    documentRect: { x: 0, y: 0, width: 100, height: 40 },
    viewportRect: { x: 0, y: 0, width: 100, height: 40 },
    displayWidth: 100,
    displayHeight: 40,
    devicePixelRatio: 1
  };
}
