import { describe, expect, it } from "vitest";
import { readFlowchartPlaybackTrace } from "../validation";
import { createFlowchartPlayback } from "../controller";
import type { FlowchartPlaybackPatch, FlowchartPlaybackStep } from "../types";

const step: FlowchartPlaybackStep = { id: "motion", title: "Q/K/V", duration: 2000, changes: [], effects: [
  { id: "edge", kind: "travel", payload: "vector", values: [.4, -.8], duration: 1200 },
  { id: "node", kind: "appear", delay: 500, duration: 1000 },
] };
/** @param id - Candidate. @param kind - Required edge identity. @returns Exact fixture target authority. */
function target(id: string, kind?: "edge"): boolean { return kind ? id === "edge" : ["edge", "node"].includes(id); }
/** @returns Manual monotonic clock and one observable logical dwell. */
function fixture() {
  let time = 0, due = 0, callback: (() => void) | undefined;
  const patches: FlowchartPlaybackPatch[] = [];
  const player = createFlowchartPlayback({ hasTarget: target, onPatch: patch => patches.push(patch), clock: {
    /** @returns Manual monotonic milliseconds. */ now: () => time,
    /** @param ms - Delay. @param fn - Logical completion. @returns Cancellation. */
    after(ms, fn) { due = time + ms; callback = fn; return () => { callback = undefined; }; },
  } });
  return { player, patches,
    /** @param ms - Manual time advance. Applies one due logical boundary. */
    tick(ms: number) { time += ms; if (callback && time >= due) { const fn = callback; callback = undefined; fn(); } },
  };
}
describe("motion choreography", () => {
  it("accepts continuous connector flow and rejects invalid styles, speeds, targets and duplicate paths", () => {
    const effects = [{ id: "edge", kind: "flow", style: "dash", speed: 48, direction: "reverse", delay: 200 }];
    expect(readFlowchartPlaybackTrace({ title: "flow", steps: [{ ...step, effects }] }, target).steps[0]!.effects).toMatchObject(effects);
    for (const effect of [
      { ...effects[0], id: "node" }, { ...effects[0], speed: 0 }, { ...effects[0], speed: 241 }, { ...effects[0], speed: NaN },
      { ...effects[0], style: "snake" }, { ...effects[0], payload: "token" }, { ...effects[0], halo: true },
      { id: "node", kind: "pulse", speed: 48 }, { id: "edge", kind: "travel", style: "dash" },
    ]) expect(() => readFlowchartPlaybackTrace({ title: "invalid", steps: [{ ...step, effects: [effect] }] }, target)).toThrow();
    expect(() => readFlowchartPlaybackTrace({ title: "duplicate", steps: [{ ...step, effects: [...effects, ...effects] }] }, target)).toThrow();
    for (const style of ["dash", "beam", "dot"]) expect(readFlowchartPlaybackTrace({ title: "flow", steps: [{ ...step, effects: [{ id: "edge", kind: "flow", style }] }] }, target).steps[0]!.effects).toHaveLength(1);
  });
  it("accepts path beams and node halos while rejecting halo properties on other cues", () => {
    const effects = [{ id: "edge", kind: "travel", payload: "beam", count: 2 }, { id: "node", kind: "pulse", halo: true }];
    expect(readFlowchartPlaybackTrace({ title: "residual", steps: [{ ...step, effects }] }, target).steps[0]!.effects).toMatchObject(effects);
    for (const effect of [{ id: "node", kind: "pulse", halo: 1 }, { id: "node", kind: "appear", halo: true }, { id: "edge", kind: "travel", halo: true }]) {
      expect(() => readFlowchartPlaybackTrace({ title: "bad", steps: [{ ...step, effects: [effect] }] }, target)).toThrow();
    }
  });
  it("detaches effects, validates exact target types and rejects unsafe/out-of-step content", () => {
    const trace = readFlowchartPlaybackTrace({ title: "run", hidden: ["node"], steps: [step] }, target);
    expect(trace.presentation).toBe("motion"); expect(Object.isFrozen(trace.steps[0]!.effects![0])).toBe(true);
    const travel = step.effects![0]!;
    for (const effect of [{ ...travel, id: "node" }, { ...travel, delay: 1901 }, { ...travel, count: 1.5 }, { ...travel, values: [NaN, 1] }, { ...travel, label: "x".repeat(81) }, { kind: "pulse", id: "node", payload: "token" }]) {
      expect(() => readFlowchartPlaybackTrace({ title: "bad", steps: [{ ...step, effects: [effect] }] }, target)).toThrow();
    }
    expect(() => readFlowchartPlaybackTrace({ title: "bad", hidden: ["node", "node"], steps: [] }, target)).toThrow();
    let invoked = false; const unsafe = { ...travel, get label() { invoked = true; return "bad"; } };
    expect(() => readFlowchartPlaybackTrace({ title: "bad", steps: [{ ...step, effects: [unsafe] }] }, target)).toThrow(); expect(invoked).toBe(false);
  });
  it("keeps motion on the logical clock across pause, rate, progress seek and explicit completed poses", () => {
    const { player, tick, patches } = fixture(); player.load({ title: "run", hidden: ["node"], steps: [step] }); player.play();
    tick(500); expect(player.getProgress()).toBe(.25); player.pause(); const notifications = patches.length;
    tick(1000); expect(player.getProgress()).toBe(.25); expect(patches).toHaveLength(notifications);
    player.setRate(2); player.play(); tick(250); expect(player.getProgress()).toBe(.5);
    player.seekProgress(.8); expect(player.getState().status).toBe("paused"); expect(player.getProgress()).toBe(.8);
    player.seek(1); expect(player.getProgress()).toBe(1); expect(patches.at(-1)!.motion?.revealed).toEqual(["node"]);
    player.replay(); expect(player.getProgress()).toBe(0); player.seek(0); expect(patches.at(-1)!.motion?.revealed).toEqual([]);
    player.step(); expect(player.getProgress()).toBe(1); player.close(); expect(player.getProgress()).toBe(0); player.destroy();
  });
  it("clears prior live effects even when the next event has no state changes or animation", () => {
    const { player, tick, patches } = fixture(), feed = player.beginLive("live"); feed.append(step); feed.append({ id: "next", title: "next", changes: [] });
    tick(2000); expect(player.getState().index).toBe(2); expect(patches.at(-1)!.motion?.effects).toEqual([]); player.destroy();
  });
  it("charges many small motion actors to the total retained-work budget atomically", () => {
    const { player } = fixture(); player.load({ title: "usable", steps: [step] });
    const effects = Array.from({ length: 64 }, () => ({ id: "edge", kind: "travel" as const, count: 16 }));
    expect(() => player.load({ title: "too much", steps: Array.from({ length: 98 }, (_, i) => ({ id: `s${i}`, title: "step", changes: [], effects })) })).toThrow();
    expect(player.getTrace().title).toBe("usable"); player.destroy();
  });
});
