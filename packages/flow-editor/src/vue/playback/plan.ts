import type { FlowchartPlaybackStep, FlowchartPlaybackTrace } from "@quirekit/flowchart";

/** @param trace - Current host or user plan. @param steps - Explicitly revised steps. @returns A plan whose appear targets are hidden initially, releasing deleted reveals while retaining unrelated host visibility. */
export function planWithSteps(trace: FlowchartPlaybackTrace, steps: readonly FlowchartPlaybackStep[]): FlowchartPlaybackTrace {
  const previous = new Set(trace.steps.flatMap(step => step.effects?.filter(effect => effect.kind === "appear").map(effect => effect.id) ?? []));
  const hidden = [...new Set([...(trace.hidden?.filter(id => !previous.has(id)) ?? []), ...steps.flatMap(step => step.effects?.filter(effect => effect.kind === "appear").map(effect => effect.id) ?? [])])];
  return { ...trace, steps, ...(hidden.length || trace.hidden ? { hidden } : {}) };
}
