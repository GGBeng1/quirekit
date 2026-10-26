import type { FlowchartMotionEffect, FlowchartRunChange } from "@quirekit/flowchart";
import type { PlaybackAnimation, PlaybackCueGroup } from "./types";

/** @param effect - A portable cue. @returns Its generic inspector preset without any domain-specific example knowledge. */
function preset(effect: FlowchartMotionEffect): PlaybackAnimation {
  if (effect.kind === "flow") return `flow-${effect.style ?? "dash"}`;
  if (effect.kind === "travel") return effect.payload ?? "dot";
  return effect.kind === "pulse" ? effect.halo ? "halo" : "pulse" : "appear";
}
/** @param existing - Prior detached choreography. @param incoming - Explicit additional capture. @returns Atomic bounded composition; replacing one target/action preserves all other parallel cues. */
export function appendStepEffects(existing: readonly FlowchartMotionEffect[], incoming: readonly FlowchartMotionEffect[]): readonly FlowchartMotionEffect[] {
  const replacements = new Set(incoming.map(effect => `${effect.id}:${effect.kind}`)), effects = [...existing.filter(effect => !replacements.has(`${effect.id}:${effect.kind}`)), ...incoming];
  if (effects.length > 64) throw new Error("每步最多设置 64 个动效目标");
  return effects;
}
/** @param existing - Previously accepted state deltas. @param incoming - Explicit state changes for this capture. @returns Detached changes preserving unrelated heterogeneous states. */
export function appendStepChanges(existing: readonly FlowchartRunChange[], incoming: readonly FlowchartRunChange[]): readonly FlowchartRunChange[] {
  const changes = new Map(existing.map(change => [change.id, change])); for (const change of incoming) changes.set(change.id, change);
  return [...changes.values()];
}
/** @param effects - At most 64 captured cues. @returns Small parameter summaries built only while authoring changes, never from animation frames. */
export function groupStepEffects(effects: readonly FlowchartMotionEffect[]): readonly PlaybackCueGroup[] {
  const groups = new Map<string, FlowchartMotionEffect[]>();
  for (const effect of effects) {
    const { id: _id, ...parameters } = effect, key = JSON.stringify(parameters), values = groups.get(key) ?? [];
    values.push(effect); groups.set(key, values);
  }
  return [...groups].map(([key, effects]) => ({ key, preset: preset(effects[0]!), effects }));
}
