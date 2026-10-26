import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createFlowchartPlayback } from "./controller";
import type { FlowchartPlaybackClock, FlowchartPlaybackPatch, FlowchartPlaybackStep } from "./types";

// The production package deliberately has no DOM/Node timer types. This test
// supplies the platform port, whose properties Vitest replaces per scenario.
const platform = globalThis as typeof globalThis & { performance: { now(): number }; setTimeout(callback: () => void, milliseconds: number): unknown; clearTimeout(id: unknown): void };
const clock: FlowchartPlaybackClock = { now: () => platform.performance.now(), after(milliseconds, callback) { const id = platform.setTimeout(callback, milliseconds); return () => platform.clearTimeout(id); } };

const events: readonly FlowchartPlaybackStep[] = [
  { id: "input", title: "输入片段", duration: 1000, changes: [{ id: "source", state: "running" }, { id: "edge", state: "running" }] },
  { id: "parse", title: "解析", changes: [{ id: "source", state: "completed" }, { id: "edge", state: "completed" }, { id: "parser", state: "running" }] },
  { id: "reuse", title: "复用", changes: [{ id: "parser", state: "reused" }] },
];
/** @returns A deterministic player with exact target validation and collected sparse patches. */
function fixture() {
  const patches: FlowchartPlaybackPatch[] = [], hasTarget = (id: string) => ["source", "parser", "edge"].includes(id);
  const player = createFlowchartPlayback({ clock, hasTarget, onPatch: patch => patches.push(patch) });
  return { player, patches };
}
beforeEach(() => { vi.useFakeTimers({ toFake: ["setTimeout", "clearTimeout", "performance"] }); });
afterEach(() => { vi.useRealTimers(); });

describe("semantic playback", () => {
  it("pauses and changes speed without reapplying or restarting a current dwell", () => {
    const { player, patches } = fixture(); player.load({ title: "运行", steps: events }); player.play();
    expect(player.getState()).toMatchObject({ status: "playing", index: 1, count: 3 });
    vi.advanceTimersByTime(400); player.pause(); const count = patches.length;
    vi.advanceTimersByTime(3000); expect(player.getState().index).toBe(1); expect(patches).toHaveLength(count);
    player.setRate(2); player.play(); vi.advanceTimersByTime(299); expect(player.getState().index).toBe(1);
    vi.advanceTimersByTime(1); expect(player.getState().index).toBe(2);
    vi.advanceTimersByTime(600); expect(player.getState().index).toBe(3);
    vi.advanceTimersByTime(600); expect(player.getState().status).toBe("completed"); player.destroy();
  });
  it("reschedules a running timer from its actual remaining logical time", () => {
    const { player } = fixture(); player.load({ title: "运行", steps: events }); player.play();
    vi.advanceTimersByTime(400); player.setRate(0.5); vi.advanceTimersByTime(1199);
    expect(player.getState().index).toBe(1); vi.advanceTimersByTime(1); expect(player.getState().index).toBe(2); player.destroy();
  });
  it("steps once, seeks through cumulative changes and replays without losing rates", () => {
    const { player, patches } = fixture(); player.load({ title: "运行", steps: events }); player.step();
    expect(player.getState()).toMatchObject({ status: "paused", index: 1 }); vi.advanceTimersByTime(3000); expect(player.getState().index).toBe(1);
    player.step(); expect(player.getTargetState("source")).toBe("completed"); player.step(); expect(player.getState().status).toBe("completed");
    player.seek(1); expect(player.getTargetState("parser")).toBeUndefined(); expect(player.getTargetState("edge")).toBe("running");
    expect(patches.at(-1)).toEqual({ reset: true, changes: events[0]!.changes });
    player.seek(0); expect(player.getState().current).toBeNull(); expect(player.getTargetState("source")).toBeUndefined();
    player.setRate(4); player.replay(); expect(player.getState()).toMatchObject({ index: 1, rate: 4, status: "playing" }); player.destroy();
  });
  it("publishes only semantic changes and suppresses unchanged target patches", () => {
    const { player, patches } = fixture(), listener = vi.fn(); const off = player.subscribe(listener);
    player.load({ title: "same", steps: [events[0]!, { ...events[0]!, id: "again" }] }); player.play(); const calls = listener.mock.calls.length;
    vi.advanceTimersByTime(100); expect(listener).toHaveBeenCalledTimes(calls); player.step();
    expect(patches).toHaveLength(2); off(); const last = listener.mock.calls.length; player.close();
    expect(listener).toHaveBeenCalledTimes(last); expect(vi.getTimerCount()).toBe(0); player.destroy(); player.destroy();
  });
});
describe("live input and isolation", () => {
  it("waits for real events, queues while paused and finishes after the final dwell", () => {
    const { player } = fixture(), feed = player.beginLive("实时执行"); expect(player.getState().status).toBe("waiting");
    expect(feed.append(events[0]!)).toBe(true); expect(player.getState().index).toBe(1);
    player.pause(); feed.append(events[1]!); vi.advanceTimersByTime(5000); expect(player.getState().index).toBe(1);
    player.step(); expect(player.getState().index).toBe(2); player.play(); vi.advanceTimersByTime(1200);
    expect(player.getState().status).toBe("waiting"); feed.finish(); expect(player.getState().status).toBe("completed");
    expect(feed.append(events[2]!)).toBe(false); player.destroy();
  });
  it("retires old feeds across replacement, close and destruction and isolates players", () => {
    const first = fixture(), second = fixture(), old = first.player.beginLive("old"), live = second.player.beginLive("second");
    first.player.load({ title: "new", steps: events }); expect(old.append(events[0]!)).toBe(false); expect(old.finish()).toBe(false);
    live.append(events[0]!); first.player.close(); expect(second.player.getState().index).toBe(1);
    second.player.destroy(); expect(live.append(events[1]!)).toBe(false); expect(vi.getTimerCount()).toBe(0);
    expect(() => second.player.play()).toThrow(); first.player.destroy();
  });
  it("rejects invalid events atomically and keeps valid queued events usable", () => {
    const { player } = fixture(), feed = player.beginLive("events"); feed.append(events[0]!);
    expect(() => feed.append(events[0]!)).toThrow(); expect(() => feed.append({ ...events[1]!, changes: [{ id: "missing", state: "running" }] })).toThrow();
    expect(player.getState()).toMatchObject({ index: 1, count: 1 }); feed.append(events[1]!); feed.finish(); player.step();
    expect(player.getState().status).toBe("completed"); const before = player.getState();
    expect(() => player.load({ title: "bad", steps: [{ ...events[0]!, duration: Number.NaN }] })).toThrow();
    expect(player.getState()).toEqual(before); expect(() => player.seek(1.5)).toThrow(); expect(() => player.setRate(0)).toThrow(); player.destroy();
  });
  it("gives detached immutable traces and explicit reduced-motion state", () => {
    const { player } = fixture(), source = { title: "portable", steps: [...events] }; player.load(source); source.steps.pop();
    expect(player.getTrace().steps).toHaveLength(3); expect(Object.isFrozen(player.getTrace().steps)).toBe(true);
    player.setReducedMotion(true); expect(player.getState().reducedMotion).toBe(true); player.close(); expect(player.getState().active).toBe(false); player.destroy();
  });
});
