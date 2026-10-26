import { describe, expect, it, vi } from "vitest";
import { createQuireDevtoolsRecorder } from "./recorder";

describe("createQuireDevtoolsRecorder", () => {
  it("records timed editor operations", () => {
    let now = 100;
    const recorder = createQuireDevtoolsRecorder({
      clock: () => now,
      slowThresholdMs: 8
    });

    const token = recorder.startOperation({
      source: "input",
      stepCount: 2,
      docChanged: true,
      selectionSet: true,
      metaKeys: ["composition", "uiEvent"]
    });
    now = 112;
    const entry = recorder.finishOperation(token);

    expect(entry).toEqual({
      id: 1,
      kind: "operation",
      source: "input",
      stepCount: 2,
      docChanged: true,
      selectionSet: true,
      metaKeys: ["composition", "uiEvent"],
      startedAt: 100,
      endedAt: 112,
      durationMs: 12,
      measured: true,
      slow: true
    });
    expect(recorder.getEntries()).toEqual([entry]);
  });

  it("records input-to-render interaction traces", () => {
    let now = 20;
    const recorder = createQuireDevtoolsRecorder({
      clock: () => now,
      slowThresholdMs: 16
    });

    const token = recorder.startInteraction({
      source: "beforeinput",
      label: "insertText",
      inputType: "insertText",
      target: "textarea"
    });
    now = 42;
    const entry = recorder.finishInteraction(token, {
      settled: true,
      operationCount: 1,
      renderCount: 1,
      operationEntryIds: [1],
      renderEntryIds: [2],
      renderEntryId: 2
    });

    expect(entry).toEqual({
      id: 1,
      kind: "interaction",
      source: "beforeinput",
      label: "insertText",
      inputType: "insertText",
      target: "textarea",
      settled: true,
      operationCount: 1,
      renderCount: 1,
      operationEntryIds: [1],
      renderEntryIds: [2],
      renderEntryId: 2,
      startedAt: 20,
      endedAt: 42,
      durationMs: 22,
      measured: true,
      slow: true
    });
  });

  it("attaches measured phases to operation entries", () => {
    let now = 10;
    const recorder = createQuireDevtoolsRecorder({
      clock: () => now
    });

    const token = recorder.startOperation({ source: "selection" });
    now = 24;
    const entry = recorder.finishOperation(token, {
      phases: [
        {
          name: "pm-apply",
          startedAt: 11,
          endedAt: 18,
          durationMs: 7
        },
        {
          name: "mounted-views",
          startedAt: 18,
          endedAt: 24,
          durationMs: 6
        }
      ]
    });

    expect(entry).toEqual(
      expect.objectContaining({
        kind: "operation",
        source: "selection",
        durationMs: 14,
        phases: [
          {
            name: "pm-apply",
            startedAt: 11,
            endedAt: 18,
            durationMs: 7
          },
          {
            name: "mounted-views",
            startedAt: 18,
            endedAt: 24,
            durationMs: 6
          }
        ]
      })
    );
  });

  it("keeps only the configured number of entries", () => {
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({
      clock: () => now,
      maxEntries: 2
    });

    for (let index = 0; index < 3; index += 1) {
      const token = recorder.startOperation({ source: `op-${index}` });
      now += 1;
      recorder.finishOperation(token);
    }

    expect(
      recorder
        .getEntries()
        .map((entry) => (entry.kind === "operation" ? entry.source : "render"))
    ).toEqual(["op-1", "op-2"]);
  });

  it("notifies subscribers until they unsubscribe", () => {
    let now = 0;
    const recorder = createQuireDevtoolsRecorder({ clock: () => now });
    const subscriber = vi.fn();
    const subscription = recorder.subscribe(subscriber);

    recorder.finishOperation(recorder.startOperation());
    subscription.unsubscribe();
    now = 1;
    recorder.finishOperation(recorder.startOperation());

    expect(subscriber).toHaveBeenCalledTimes(1);
  });

  it("skips records and notifications when disabled", () => {
    const recorder = createQuireDevtoolsRecorder({ enabled: false });
    const subscriber = vi.fn();

    recorder.subscribe(subscriber);
    const entry = recorder.finishOperation(recorder.startOperation());

    expect(entry).toBeUndefined();
    expect(recorder.getEntries()).toEqual([]);
    expect(subscriber).not.toHaveBeenCalled();
  });
});
