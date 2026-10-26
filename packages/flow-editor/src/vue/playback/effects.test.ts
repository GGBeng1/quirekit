import { describe, expect, it } from "vitest";
import { stepEffects } from "./effects";
import { planWithSteps } from "./plan";
import { appendStepChanges, appendStepEffects, groupStepEffects } from "./collection";
import type { PlaybackEffectDraft } from "./types";

const draft: PlaybackEffectDraft = { animation: "flow-dash", targets: ["node", "edge"], edges: ["edge"], title: "阶段说明", direction: "reverse", speed: 96, delay: 200, existing: undefined };
describe("generic animation authoring", () => {
  it("composes parallel effects while replacing only the addressed target and preserving mixed states", () => {
    const first = [{ id: "e1", kind: "flow" as const }, { id: "e2", kind: "flow" as const }, { id: "node", kind: "pulse" as const, halo: true }];
    const effects = appendStepEffects(first, [{ id: "e1", kind: "flow", direction: "reverse" }]);
    expect(effects).toEqual([first[1], first[2], { id: "e1", kind: "flow", direction: "reverse" }]); expect(first).toHaveLength(3);
    expect(groupStepEffects(first).map(group => [group.preset, group.effects.length])).toEqual([["flow-dash", 2], ["halo", 1]]);
    expect(appendStepChanges([{ id: "one", state: "invalid" }, { id: "two", state: "reused" }], [{ id: "one", state: "running" }])).toEqual([{ id: "one", state: "running" }, { id: "two", state: "reused" }]);
    const full = Array.from({ length: 64 }, (_, i) => ({ id: `e${i}`, kind: "flow" as const }));
    expect(() => appendStepEffects(full, [{ id: "extra", kind: "pulse" }])).toThrow("64"); expect(full).toHaveLength(64);
  });
  it("applies connector flow to mixed captures without adding boxes or animating nodes", () => {
    expect(stepEffects(draft)).toEqual([{ id: "edge", kind: "flow", style: "dash", speed: 96, delay: 200, direction: "reverse" }]);
    expect(draft.targets).toEqual(["node", "edge"]);
  });
  it("keeps node halos separate from transfers and rejects missing or over-budget targets", () => {
    expect(stepEffects({ ...draft, animation: "halo" })).toEqual([{ id: "node", kind: "pulse", halo: true, delay: 200 }]);
    expect(() => stepEffects({ ...draft, edges: [] })).toThrow("请选择连线");
    const edges = Array.from({ length: 65 }, (_, i) => `e${i}`);
    expect(() => stepEffects({ ...draft, targets: edges, edges })).toThrow("64");
  });
  it("preserves heterogeneous existing choreography and captions only content-bearing payloads", () => {
    const existing = [{ id: "node", kind: "appear" as const, delay: 500 }, { id: "edge", kind: "travel" as const, payload: "vector" as const, delay: 1000 }];
    expect(stepEffects({ ...draft, animation: "existing", existing })).toBe(existing);
    expect(stepEffects({ ...draft, animation: "none" })).toBeUndefined();
    expect(stepEffects({ ...draft, animation: "beam" })?.[0]).not.toHaveProperty("label");
    expect(stepEffects({ ...draft, animation: "token" })?.[0]).toMatchObject({ label: "阶段说明", direction: "reverse" });
  });
  it("adds initial reveal visibility and removes deleted appear ownership without losing unrelated host targets", () => {
    const step = { id: "s", title: "显示", changes: [], effects: [{ id: "node", kind: "appear" as const }] };
    const original = { title: "plan", steps: [], hidden: ["host"] }, plan = planWithSteps(original, [step]);
    expect(plan.hidden).toEqual(["host", "node"]);
    expect(planWithSteps(plan, []).hidden).toEqual(["host"]); expect(original.hidden).toEqual(["host"]);
  });
});
