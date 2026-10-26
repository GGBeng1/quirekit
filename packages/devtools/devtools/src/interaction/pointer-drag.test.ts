// @vitest-environment happy-dom

import { afterEach, describe, expect, it, vi } from "vitest";
import { createQuireDevtoolsRecorder } from "../recorder";
import type { QuireDevtoolsInteractionInput, QuireDevtoolsMount } from "../types";
import { observeQuireDevtoolsInteractions } from "./observer";
import { QuireDevtoolsInteractionTraceManager } from "./trace";

const observers: QuireDevtoolsMount[] = [];

describe("devtools pointer drag observation", () => {
  afterEach(() => {
    for (const observer of observers.splice(0)) observer.destroy();
    document.body.replaceChildren();
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("records the earliest move immediately and bounds sampling to one per frame", () => {
    const fixture = createDragFixture();
    dispatchPointer(fixture.surface, "pointerdown");
    fixture.record.mockClear();

    dispatchPointer(fixture.surface, "pointermove");
    expect(fixture.record).toHaveBeenCalledExactlyOnceWith({
      source: "pointermove",
      label: "drag selection",
      target: "canvas"
    });
    for (let index = 0; index < 100; index += 1) {
      dispatchPointer(fixture.surface, "pointermove");
    }
    expect(fixture.record).toHaveBeenCalledOnce();
    expect(fixture.frames.size).toBe(1);

    fixture.runFrame();
    dispatchPointer(fixture.surface, "pointermove");
    expect(fixture.record).toHaveBeenCalledTimes(2);
  });

  it("excludes hover, secondary buttons, unrelated pointers, and ignored UI", () => {
    const fixture = createDragFixture();
    dispatchPointer(fixture.surface, "pointermove");
    dispatchPointer(fixture.surface, "pointerdown", { button: 2, buttons: 2 });
    dispatchPointer(fixture.surface, "pointermove", { buttons: 2 });
    dispatchPointer(fixture.surface, "pointerup", { button: 2, buttons: 0 });
    dispatchPointer(fixture.ignored, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove");
    dispatchPointer(fixture.surface, "pointerup", { buttons: 0 });
    expect(dragInputs(fixture.record)).toHaveLength(0);

    dispatchPointer(fixture.surface, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove", { pointerId: 2 });
    dispatchPointer(fixture.ignored, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(0);
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(1);
  });

  it.each(["pointerup", "pointercancel"])(
    "tracks an owned drag outside the host and clears it on %s",
    (endType) => {
      const fixture = createDragFixture();
      dispatchPointer(fixture.surface, "pointerdown");
      dispatchPointer(document.body, "pointermove");
      expect(dragInputs(fixture.record)).toHaveLength(1);
      dispatchPointer(window, endType, { pointerId: 2, buttons: 0 });
      expect(fixture.frames.size).toBe(1);
      dispatchPointer(window, endType, { buttons: 0 });
      expect(fixture.frames.size).toBe(0);
      fixture.runFrame();
      dispatchPointer(document.body, "pointermove");
      expect(dragInputs(fixture.record)).toHaveLength(1);

      dispatchPointer(fixture.surface, "pointerdown");
      dispatchPointer(fixture.surface, "pointermove");
      expect(dragInputs(fixture.record)).toHaveLength(2);
    }
  );

  it("clears lost-button sessions and cancels pending sampling on destroy", () => {
    const fixture = createDragFixture();
    dispatchPointer(fixture.surface, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove");
    dispatchPointer(fixture.surface, "pointermove", { buttons: 0 });
    expect(fixture.frames.size).toBe(0);
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(1);

    dispatchPointer(fixture.surface, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove");
    expect(fixture.frames.size).toBe(1);
    fixture.observer.destroy();
    expect(fixture.frames.size).toBe(0);
    dispatchPointer(fixture.surface, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(2);
  });

  it("ends stale ownership on window blur or a new ignored press", () => {
    const fixture = createDragFixture();
    dispatchPointer(fixture.surface, "pointerdown");
    fixture.surface.dispatchEvent(new FocusEvent("blur"));
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(1);
    window.dispatchEvent(new FocusEvent("blur"));
    expect(fixture.frames.size).toBe(0);
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(1);

    dispatchPointer(fixture.surface, "pointerdown");
    dispatchPointer(fixture.ignored, "pointerdown");
    dispatchPointer(fixture.surface, "pointermove");
    expect(dragInputs(fixture.record)).toHaveLength(1);
  });

  it("retains the earliest drag time and its operation/render trace links", () => {
    vi.useFakeTimers();
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const manager = new QuireDevtoolsInteractionTraceManager({ recorder });
    const fixture = createDragFixture((input) => manager.start(input));
    dispatchPointer(fixture.surface, "pointerdown");
    now = 10;
    dispatchPointer(fixture.surface, "pointermove");
    now = 15;
    dispatchPointer(fixture.surface, "pointermove");
    now = 18;
    const operation = recorder.finishOperation(
      recorder.startOperation({ source: "transaction" })
    );
    now = 20;
    const render = recorder.recordRender({
      viewId: "primary",
      mode: "canvas",
      strategy: "selection-update",
      commandCount: 1,
      blockCount: 1,
      caretCount: 0,
      selectionRangeCount: 1,
      overlayCount: 0,
      documentRect: { x: 0, y: 0, width: 100, height: 40 },
      viewportRect: { x: 0, y: 0, width: 100, height: 40 },
      displayWidth: 100,
      displayHeight: 40,
      devicePixelRatio: 1
    });
    manager.settleAfterRender(render);
    dispatchPointer(window, "pointerup", { buttons: 0 });
    now = 30;
    fixture.runFrame();

    expect(recorder.getEntries().filter((entry) =>
      entry.kind === "interaction" && entry.source === "pointermove"
    )).toEqual([expect.objectContaining({
      startedAt: 10,
      durationMs: 20,
      settled: true,
      operationEntryIds: [operation?.id],
      renderEntryIds: [render?.id],
      renderEntryId: render?.id
    })]);
    manager.destroy();
  });
});

/**
 * Creates one mounted observer with a deterministic animation-frame queue.
 *
 * @param onRecord - Optional real trace recorder behind the observer spy.
 * @returns Host surfaces, recorded events, and explicit frame control.
 */
function createDragFixture(onRecord?: (input: QuireDevtoolsInteractionInput) => void) {
  const root = document.createElement("div");
  const surface = document.createElement("canvas");
  const ignored = document.createElement("button");
  ignored.setAttribute("data-qk-devtools-ignore-interactions", "");
  root.append(surface, ignored);
  document.body.append(root);
  const record = vi.fn(onRecord);
  const frames = new Map<number, FrameRequestCallback>();
  let nextFrame = 0;
  vi.spyOn(window, "requestAnimationFrame").mockImplementation((callback) => {
    const frame = ++nextFrame;
    frames.set(frame, callback);
    return frame;
  });
  vi.spyOn(window, "cancelAnimationFrame").mockImplementation((frame) => {
    frames.delete(frame);
  });
  const observer = observeQuireDevtoolsInteractions(root, { record });
  observers.push(observer);

  return {
    surface,
    ignored,
    record,
    frames,
    observer,
    /** Advances one frame without replaying callbacks queued during it. */
    runFrame(): void {
      const callbacks = [...frames.values()];
      frames.clear();
      for (const callback of callbacks) callback(0);
    }
  };
}

/**
 * Dispatches a primary-button mouse event unless a test overrides its fields.
 *
 * @param target - Element or window receiving the event.
 * @param type - Pointer event name.
 * @param overrides - Pointer identity or button overrides.
 */
function dispatchPointer(
  target: EventTarget,
  type: string,
  overrides: PointerEventInit = {}
): void {
  target.dispatchEvent(new PointerEvent(type, {
    bubbles: true,
    pointerId: 1,
    button: 0,
    buttons: 1,
    ...overrides
  }));
}

/**
 * Reads only drag samples, excluding the existing pointerdown trace.
 *
 * @param record - Observer callback spy.
 * @returns Recorded drag inputs.
 */
function dragInputs(record: ReturnType<typeof vi.fn>) {
  return record.mock.calls.flatMap(([input]) =>
    input.source === "pointermove" ? [input] : []
  );
}
