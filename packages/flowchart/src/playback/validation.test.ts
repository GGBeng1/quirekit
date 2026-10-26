import { describe, expect, it } from "vitest";
import { createFlowchartPlayback } from "./controller";
import { readFlowchartPlaybackTrace } from "./validation";
import type { FlowchartPlaybackClock, FlowchartPlaybackStep } from "./types";

const step: FlowchartPlaybackStep = { id: "first", title: "处理", changes: [{ id: "node", state: "running" }] };
const platform = globalThis as typeof globalThis & { performance: { now(): number }; setTimeout(callback: () => void, milliseconds: number): unknown; clearTimeout(id: unknown): void };
const clock: FlowchartPlaybackClock = { now: () => platform.performance.now(), after(milliseconds, callback) { const id = platform.setTimeout(callback, milliseconds); return () => platform.clearTimeout(id); } };
/** @param steps - Untrusted step list. @returns Checked trace for one exact target. */
function read(steps: unknown) { return readFlowchartPlaybackTrace({ title: "demo", steps }, id => id === "node"); }
describe("bounded playback input", () => {
  it("rejects unknown fields, sparse/getter inputs and duplicate IDs without invoking code", () => {
    expect(() => read([{ ...step, position: { x: 1 } }])).toThrow();
    expect(() => read([{ ...step, changes: [{ id: "node", state: "future" }] }])).toThrow();
    expect(() => read([step, step])).toThrow(); expect(() => read([{ ...step, changes: [...step.changes, ...step.changes] }])).toThrow();
    let invoked = false;
    const accessor = { ...step, get title() { invoked = true; return "unsafe"; } };
    expect(() => read([accessor])).toThrow(); expect(invoked).toBe(false);
    const sparse = new Array(1); expect(() => read(sparse)).toThrow();
    Object.defineProperty(sparse, "0", { get() { invoked = true; return step; } });
    expect(() => read(sparse)).toThrow(); expect(invoked).toBe(false);
    const overridden = [step]; Object.defineProperty(overridden, "map", { get() { invoked = true; return Array.prototype.map; } });
    expect(() => read(overridden)).toThrow(); expect(invoked).toBe(false);
  });
  it("preserves plain host text while checking states, targets, dwell and Unicode", () => {
    const title = "解析 → <b>不是 HTML</b> 🧩", trace = read([{ ...step, title, description: "说明\n第二行", duration: 100 }]);
    expect(trace.steps[0]!.title).toBe(title); expect(Object.isFrozen(trace.steps[0]!.changes[0])).toBe(true);
    for (const duration of [0, 99, 60001, Number.NaN, Number.POSITIVE_INFINITY]) expect(() => read([{ ...step, duration }])).toThrow();
    expect(() => read([{ ...step, title: "  " }])).toThrow(); expect(() => read([{ ...step, title: "\uD800" }])).toThrow();
    expect(() => read([{ ...step, changes: [{ id: "other", state: "running" }] }])).toThrow();
  });
  it("bounds count, accumulated changes and text before replacing a usable run", () => {
    const player = createFlowchartPlayback({ clock, hasTarget: () => true }); player.load({ title: "old", steps: [step] });
    const large = Array.from({ length: 5001 }, (_, i) => ({ ...step, id: `s${i}` }));
    expect(() => player.load({ title: "overflow", steps: large })).toThrow(); expect(player.getTrace().title).toBe("old");
    const textHeavy = Array.from({ length: 101 }, (_, i) => ({ ...step, id: `t${i}`, title: "x".repeat(10000) }));
    expect(() => player.load({ title: "text", steps: textHeavy })).toThrow(); expect(player.getTrace().title).toBe("old");
    const changes = Array.from({ length: 1000 }, (_, i) => ({ id: `n${i}`, state: "pending" as const }));
    expect(() => player.load({ title: "changes", steps: Array.from({ length: 101 }, (_, i) => ({ id: `c${i}`, title: "c", changes })) })).toThrow();
    expect(player.getTrace().title).toBe("old"); player.destroy();
  });
  it("refuses overflow live events while retaining every prior event and permits finishing", () => {
    const player = createFlowchartPlayback({ clock, hasTarget: () => true }), feed = player.beginLive("bounded"); player.pause();
    for (let i = 0; i < 5000; i++) feed.append({ id: `s${i}`, title: "step", changes: [] });
    expect(() => feed.append({ id: "extra", title: "extra", changes: [] })).toThrow();
    expect(player.getState()).toMatchObject({ count: 5000, index: 0, status: "paused" });
    feed.finish(); player.seek(5000); expect(player.getState().status).toBe("completed"); player.destroy();
  });
});
