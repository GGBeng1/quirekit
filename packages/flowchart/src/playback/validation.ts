import { choice, identity, number, record, text } from "../model/validation";
import { playbackList, playbackTitle } from "./input";
import { readMotionEffects } from "./motion/validation";
import { readFlowchart } from "../model/document";
import { sceneTargets } from "./scene/targets";
import type { FlowchartPlaybackStep, FlowchartPlaybackTrace, FlowchartRunChange } from "./types";

/** @param value - Untrusted event. @param hasTarget - Exact target authority. @returns Detached immutable event. */
export function readPlaybackStep(value: unknown, hasTarget: (id: string, kind?: "edge") => boolean): FlowchartPlaybackStep {
  const source = record(value, ["id", "title", "description", "duration", "changes", "effects", "scene", "sceneDuration"], "playback.step"), targets = new Set<string>();
  const duration = source.duration === undefined ? 1200 : number(source.duration, 100, 60000, "playback.duration");
  const scene = source.scene === undefined ? undefined : readFlowchart(source.scene);
  if (source.sceneDuration !== undefined && !scene) throw new TypeError("场景时长需要对应的场景");
  const sceneDuration = source.sceneDuration === undefined ? undefined : number(source.sceneDuration, 100, duration, "playback.sceneDuration");
  const owns = sceneTargets(scene, hasTarget);
  const changes = playbackList(source.changes, 1000).map(value => {
    const item = record(value, ["id", "state"], "playback.change"), id = identity(item.id);
    if (!owns(id)) throw new TypeError("演示目标已不存在，请重新选择");
    if (targets.has(id)) throw new TypeError("同一步骤不能重复更新同一个目标"); targets.add(id);
    return Object.freeze<FlowchartRunChange>({ id, state: choice(item.state, ["pending", "running", "completed", "reused", "invalid"], "playback.state") });
  });
  return Object.freeze({ id: identity(source.id), title: playbackTitle(source.title),
    ...(scene === undefined ? {} : { scene }), ...(sceneDuration === undefined ? {} : { sceneDuration }),
    ...(source.effects === undefined ? {} : { effects: readMotionEffects(source.effects, owns, duration) }),
    ...(source.description === undefined ? {} : { description: text(source.description) }),
    ...(source.duration === undefined ? {} : { duration }), changes: Object.freeze(changes) });
}
/** @param step - Checked event. @returns Retained plain-text size, including IDs. */
export function playbackTextSize(step: FlowchartPlaybackStep): number {
  return step.id.length + step.title.length + (step.description?.length ?? 0) + step.changes.reduce((size, change) => size + change.id.length, 0)
    + (step.effects?.reduce((size, effect) => size + effect.id.length + (effect.kind === "travel" ? effect.label?.length ?? 0 : 0), 0) ?? 0)
    + (step.scene ? JSON.stringify(step.scene).length : 0);
}
/** @param step - Checked event. @returns State updates and bounded animation actors charged to the retained-work budget. */
export function playbackWorkSize(step: FlowchartPlaybackStep): number { return step.changes.length + (step.scene ? step.scene.nodes.length + step.scene.edges.length : 0) + (step.effects?.reduce((sum, effect) => sum + (effect.kind === "travel" ? effect.count ?? 1 : 1), 0) ?? 0); }
/** @param count - Total events. @param changes - Total changes. @param characters - Total retained text. */
export function assertPlaybackBudget(count: number, changes: number, characters: number): void {
  if (count > 5000 || changes > 100000 || characters > 1000000) throw new RangeError("演示记录已达上限，请结束本次运行");
}
/** @param value - Untrusted trace. @param hasTarget - Exact node/edge lookup. @returns Detached, bounded and deeply immutable trace. */
export function readFlowchartPlaybackTrace(value: unknown, hasTarget: (id: string, kind?: "edge") => boolean): FlowchartPlaybackTrace {
  const source = record(value, ["title", "steps", "presentation", "hidden"], "playback.trace"), title = playbackTitle(source.title), ids = new Set<string>();
  const hidden = source.hidden === undefined ? undefined : playbackList(source.hidden, 1000).map(raw => { const id = identity(raw); if (!hasTarget(id)) throw new TypeError("演示目标已不存在，请重新选择"); return id; });
  if (hidden && new Set(hidden).size !== hidden.length) throw new TypeError("初始隐藏目标不能重复");
  let changes = hidden?.length ?? 0, characters = title.length + (hidden?.reduce((size, id) => size + id.length, 0) ?? 0);
  let owns = hasTarget;
  const steps = playbackList(source.steps, 5000).map(value => {
    const step = readPlaybackStep(value, owns);
    if (step.scene) owns = sceneTargets(step.scene, hasTarget);
    if (ids.has(step.id)) throw new TypeError("演示步骤标识不能重复"); ids.add(step.id);
    changes += playbackWorkSize(step); characters += playbackTextSize(step); assertPlaybackBudget(ids.size, changes, characters);
    return step;
  });
  return Object.freeze({ title, steps: Object.freeze(steps),
    ...(hidden === undefined ? {} : { hidden: Object.freeze(hidden) }),
    ...(source.presentation === undefined ? (steps.some(step => step.effects?.length || step.scene) ? { presentation: "motion" as const } : {}) : { presentation: choice(source.presentation, ["status", "motion"], "playback.presentation") }) });
}
