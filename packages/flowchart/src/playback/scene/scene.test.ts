import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { createFlowchart, createFlowchartNode } from "../../model/create";
import { createFlowchartPlayback } from "../controller";
import { readFlowchartPlaybackTrace } from "../validation";
import type { FlowchartPlaybackClock, FlowchartPlaybackPatch } from "../types";

const platform = globalThis as typeof globalThis & { performance: { now(): number }; setTimeout(callback: () => void, milliseconds: number): unknown; clearTimeout(id: unknown): void };
const clock: FlowchartPlaybackClock = { now: () => platform.performance.now(), after(milliseconds, callback) {
  const timer = platform.setTimeout(callback, milliseconds); return () => platform.clearTimeout(timer);
} };
const first = { ...createFlowchart(), nodes: [createFlowchartNode("kept", "process", { x: 0, y: 0 }, "range 0–10")] };
const next = { ...first, nodes: [{ ...first.nodes[0]!, x: 200, text: "range 9–19" }, createFlowchartNode("new", "process", { x: 400, y: 0 }, "inserted")] };

beforeEach(() => vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] }));
afterEach(() => vi.useRealTimers());

it("validates newly introduced targets and subsequent events against their accepted scene", () => {
  const trace = readFlowchartPlaybackTrace({ title: "state evolution", steps: [
    { id: "before", title: "before", scene: first, changes: [] },
    { id: "after", title: "after", scene: next, sceneDuration: 600, changes: [{ id: "new", state: "running" }] },
    { id: "later", title: "later", changes: [], effects: [{ id: "new", kind: "pulse" }] },
  ] }, () => false);
  expect(trace.steps[1]!.scene!.nodes[0]!.text).toBe("range 9–19");
  expect(Object.isFrozen(trace.steps[1]!.scene!.nodes[0])).toBe(true);
  expect(() => readFlowchartPlaybackTrace({ ...trace, steps: [{ ...trace.steps[0], changes: [{ id: "new", state: "running" }] }] }, () => true)).toThrow();
  expect(() => readFlowchartPlaybackTrace({ ...trace, steps: [{ ...trace.steps[1], sceneDuration: 1300 }] }, () => false)).toThrow();
});

it("restores scene prefixes, preserves logical time and clears presentation on close", () => {
  const patches: FlowchartPlaybackPatch[] = [], player = createFlowchartPlayback({ clock, hasTarget: () => false, onPatch: patch => patches.push(patch) });
  player.load({ title: "evolution", steps: [
    { id: "before", title: "before", duration: 1000, scene: first, changes: [] },
    { id: "after", title: "after", duration: 2000, scene: next, sceneDuration: 1400, changes: [] },
    { id: "settle", title: "settle", changes: [] },
  ] });
  player.play(); vi.advanceTimersByTime(1000); vi.advanceTimersByTime(500); player.pause();
  expect(player.getProgress()).toBe(.25); expect(patches.at(-1)!.scene!.nodes).toHaveLength(2);
  player.setRate(1.5); player.play(); vi.advanceTimersByTime(1000); expect(player.getState().index).toBe(3);
  player.seek(1); expect(patches.at(-1)).toMatchObject({ reset: true, scene: first });
  player.seek(2); expect(patches.at(-1)).toMatchObject({ reset: true, scene: next, sceneFrom: first, sceneDuration: 1400 });
  player.seekProgress(.1); expect(player.getProgress()).toBeCloseTo(.1, 12);
  player.seek(3); expect(patches.at(-1)).toMatchObject({ reset: true, scene: next });
  player.replay(); expect(patches.at(-1)!.scene).toEqual(first);
  player.close(); expect(patches.at(-1)!.scene).toBeNull(); player.destroy();
});

it("validates queued live scenes in event order while retaining the old feed boundary", () => {
  const player = createFlowchartPlayback({ clock, hasTarget: () => false });
  const feed = player.beginLive("live"); player.pause();
  feed.append({ id: "before", title: "before", scene: first, changes: [] });
  feed.append({ id: "after", title: "after", scene: next, changes: [] });
  expect(feed.append({ id: "target", title: "target", changes: [{ id: "new", state: "completed" }] })).toBe(true);
  player.close(); expect(feed.append({ id: "retired", title: "retired", scene: next, changes: [] })).toBe(false); player.destroy();
});

it("charges all retained scene objects and text against the trace budget", () => {
  const large = { ...first, nodes: Array.from({ length: 75 }, (_, i) => ({ ...first.nodes[0]!, id: `kept-${i}`, text: "x".repeat(8000) })) };
  expect(() => readFlowchartPlaybackTrace({ title: "bounded", steps: [
    { id: "a", title: "a", scene: large, changes: [] }, { id: "b", title: "b", scene: large, changes: [] },
  ] }, () => false)).toThrow(/上限/);
});
