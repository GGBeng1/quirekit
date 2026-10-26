import { createPlaybackTimer } from "./clock";
import { assertPlaybackBudget, playbackTextSize, playbackWorkSize, readFlowchartPlaybackTrace, readPlaybackStep } from "./validation";
import { playbackTitle } from "./input";
import type { FlowchartDocument } from "../model/types";
import { sceneTargets } from "./scene/targets";
import type { FlowchartMotionEffect } from "./motion/types";
import type { FlowchartPlayback, FlowchartPlaybackOptions, FlowchartPlaybackState, FlowchartPlaybackStep, FlowchartRunChange, FlowchartRunState } from "./types";

/** @param options - Target authority and sparse rendering port. @returns Isolated bounded player with no document mutations. */
export function createFlowchartPlayback(options: FlowchartPlaybackOptions): FlowchartPlayback {
  const listeners = new Set<(state: FlowchartPlaybackState) => void>(), targets = new Map<string, FlowchartRunState>();
  let steps: FlowchartPlaybackStep[] = [], ids = new Set<string>(), characters = 0, changeCount = 0;
  let active = false, mode: FlowchartPlaybackState["mode"] = null, status: FlowchartPlaybackState["status"] = "idle";
  let title = "", index = 0, rate = 1, reducedMotion = false, ended = true, destroyed = false, generation = 0;
  let presentation: "status" | "motion" | undefined, hidden: readonly string[] | undefined;
  const revealed = new Set<string>();
  let currentScene: FlowchartDocument | undefined, recordedScene: FlowchartDocument | undefined;
  const timer = createPlaybackTimer(options.clock, () => advance(true));
  /** Rejects stale controller calls without changing a newer run. */
  function alive(): void { if (destroyed) throw new Error("演示播放器已关闭"); }
  /** @returns Small immutable state; event arrays remain retained. */
  function state(): FlowchartPlaybackState { return Object.freeze({ runId: generation, active, mode, status, title, index, count: steps.length, current: steps[index - 1] ?? null, rate, reducedMotion, presentation: presentation ?? "status" }); }
  /** Publishes semantic boundaries only, never animation frames. */
  function notify(): void { const value = state(); for (const listener of [...listeners]) listener(value); }
  /** @param changes - Accepted updates. @param reset - Replaces cumulative state. @param effects - Current-step choreography. @param scene - Accepted visual scene. @param sceneDuration - Logical transition length. @param sceneFrom - Explicit restored event baseline. Applies presentation before publishing the explanation. */
  function present(changes: readonly FlowchartRunChange[], reset = false, effects: readonly FlowchartMotionEffect[] = [], scene?: FlowchartDocument, sceneDuration?: number, sceneFrom?: FlowchartDocument): void {
    const sceneChanged = scene !== undefined || reset && currentScene !== undefined;
    const beforeScene = reset ? sceneFrom : currentScene;
    if (reset || scene) currentScene = scene;
    if (reset) targets.clear();
    const changed = changes.filter(change => targets.get(change.id) !== change.state);
    for (const change of changed) targets.set(change.id, change.state);
    const motion = active && (presentation !== undefined || hidden !== undefined || effects.length > 0);
    const appeared: string[] = [];
    for (const effect of effects) if (effect.kind === "appear") { if (!revealed.has(effect.id)) appeared.push(effect.id); revealed.add(effect.id); }
    if (reset || changed.length || motion || sceneChanged) options.onPatch?.(Object.freeze({ reset, changes: Object.freeze(changed),
      ...(sceneChanged ? { scene: currentScene ?? null, ...(scene && beforeScene ? { sceneFrom: beforeScene } : {}), ...(sceneDuration === undefined ? {} : { sceneDuration }) } : {}),
      ...(motion ? { motion: Object.freeze({ presentation: presentation ?? "status", ...(reset || sceneChanged ? { hidden: hidden ?? [] } : {}), revealed: Object.freeze(reset || sceneChanged ? [...revealed] : appeared), effects }) } : {}) }));
  }
  /** @param automatic - Continue time-based playback, rather than a single user step. */
  function advance(automatic: boolean): void {
    timer.pause();
    if (index >= steps.length) { status = ended ? "completed" : automatic ? "waiting" : "paused"; notify(); return; }
    const step = steps[index++]!; status = automatic ? "playing" : ended && index === steps.length ? "completed" : "paused";
    timer.reset(step.duration ?? 1200); if (!automatic && (step.effects?.length || step.scene)) timer.seek(1);
    present(step.changes, false, step.effects, step.scene, step.scene ? step.sceneDuration ?? step.duration ?? 1200 : undefined);
    if (automatic) timer.run(); notify();
  }
  /** @param heading - Checked title. @param kind - Run source. Resets a run after validation and native input ownership have been accepted. */
  function enter(heading: string, kind: "preset" | "live"): void {
    timer.reset(0); generation++; active = true; mode = kind; title = heading; index = 0;
    steps = []; ids = new Set(); characters = heading.length + (hidden?.reduce((size, id) => size + id.length, 0) ?? 0); changeCount = hidden?.length ?? 0; ended = kind === "preset"; revealed.clear();
    recordedScene = undefined;
    status = kind === "preset" ? "ready" : "waiting"; present([], true);
  }
  /** Restores an empty prefix without retiring a still-producing live feed. */
  function rewind(): void { timer.reset(0); index = 0; status = "ready"; revealed.clear(); present([], true); }
  const player: FlowchartPlayback = {
    /** @param trace - Complete teaching sequence, validated before changing the prior run. */
    load(trace) {
      alive(); const checked = readFlowchartPlaybackTrace(trace, options.hasTarget);
      // Keep the previous run intact if its native input owner rejects entry.
      options.beforeEnter?.(); presentation = checked.presentation; hidden = checked.hidden; enter(checked.title, "preset");
      steps = [...checked.steps]; ids = new Set(steps.map(step => step.id)); notify();
    },
    /** @param heading - Live run title. @returns Run-scoped event sink, safe against late callbacks. */
    beginLive(heading) {
      alive(); const title = playbackTitle(heading); options.beforeEnter?.(); presentation = undefined; hidden = undefined; enter(title, "live"); const ticket = generation; notify();
      return Object.freeze({
        /** @param event - New event. @returns Whether this exact live run accepted it. */
        append(event: FlowchartPlaybackStep): boolean {
          if (destroyed || generation !== ticket || ended) return false;
          const step = readPlaybackStep(event, sceneTargets(recordedScene, options.hasTarget));
          if (ids.has(step.id)) throw new TypeError("演示步骤标识不能重复");
          const nextText = characters + playbackTextSize(step), nextChanges = changeCount + playbackWorkSize(step);
          assertPlaybackBudget(steps.length + 1, nextChanges, nextText);
          if ((step.effects?.length || step.scene) && presentation === undefined) presentation = "motion";
          steps.push(step); ids.add(step.id); characters = nextText; changeCount = nextChanges;
          if (step.scene) recordedScene = step.scene;
          if (status === "waiting") advance(true); else notify(); return true;
        },
        /** @returns Whether this live run is still valid; finishing twice is harmless. */
        finish(): boolean {
          if (destroyed || generation !== ticket) return false;
          if (ended) return true;
          ended = true; if (status === "waiting") status = "completed"; notify(); return true;
        },
      });
    },
    /** Continues the current dwell or starts the next event exactly once. */
    play() {
      alive(); if (!active || status === "playing" || status === "waiting") return;
      if (status === "completed") rewind();
      if (index && timer.hasRemaining()) { status = "playing"; timer.run(); notify(); } else advance(true);
    },
    /** Captures remaining logical time without reapplying the current event. */
    pause() { alive(); if (!active || (status !== "playing" && status !== "waiting")) return; timer.pause(); status = "paused"; notify(); },
    /** Applies one event only, even while an automatic timer was running. */
    step() { alive(); if (active) advance(false); },
    /** @param value - Applied prefix length. Folds the prefix once at this explicit navigation boundary. */
    seek(value) {
      alive(); if (!Number.isInteger(value) || value < 0 || value > steps.length) throw new RangeError("无效的演示步骤位置");
      if (!active) return;
      timer.reset(steps[value - 1]?.duration ?? 1200); if (steps[value - 1]?.effects?.length || steps[value - 1]?.scene) timer.seek(1);
      index = value; status = ended && index === steps.length ? "completed" : "paused";
      const prefix = new Map<string, FlowchartRunState>();
      let scene: FlowchartDocument | undefined, sceneFrom: FlowchartDocument | undefined;
      revealed.clear();
      for (let i = 0; i < value; i++) { sceneFrom = scene; scene = steps[i]!.scene ?? scene; for (const change of steps[i]!.changes) prefix.set(change.id, change.state); for (const effect of steps[i]!.effects ?? []) if (effect.kind === "appear") revealed.add(effect.id); }
      const selected = steps[value - 1];
      present([...prefix].map(([id, state]) => ({ id, state })), true, selected?.effects, scene, selected?.sceneDuration ?? selected?.duration, selected?.scene ? sceneFrom : scene); notify();
    },
    /** Clears prior target state and starts this recorded sequence again. */
    replay() { alive(); if (!active) return; rewind(); advance(true); },
    /** @param value - Finite supported multiplier. */
    setRate(value) {
      alive(); if (!Number.isFinite(value) || value < 0.25 || value > 4) throw new RangeError("演示倍速须在 0.25–4 之间");
      if (rate === value) return; timer.setRate(value); rate = value; notify();
    },
    /** @param value - Embedding motion preference, independent of semantic timing. */
    setReducedMotion(value) { alive(); if (typeof value !== "boolean") throw new TypeError("无效的演示动效设置"); if (reducedMotion !== value) { reducedMotion = value; notify(); } },
    /** @returns Current semantic boundary without graph or trace serialization. */ getState() { alive(); return state(); },
    /** @returns Current logical progress with no event notification. */ getProgress() { alive(); return index ? timer.progress() : 0; },
    /** @param progress - Explicit current-step position. Pauses without changing semantic ownership. */
    seekProgress(progress) { alive(); if (!Number.isFinite(progress) || progress < 0 || progress > 1) throw new RangeError("无效的步骤进度"); if (!active || !index) return; timer.seek(progress); status = "paused"; notify(); },
    /** @returns Immutable trace snapshot at an explicit host read boundary. */ getTrace() { alive(); return Object.freeze({ title, steps: Object.freeze([...steps]), ...(presentation === undefined ? {} : { presentation }), ...(hidden === undefined ? {} : { hidden }) }); },
    /** @param id - Target identity. @returns State retained by prior events. */ getTargetState(id) { alive(); return targets.get(id); },
    /** @param listener - Small boundary observer. @returns Idempotent removal. */
    subscribe(listener) { alive(); listeners.add(listener); listener(state()); return () => { listeners.delete(listener); }; },
    /** Retires this run and restores the renderer's original presentation. */
    close() {
      if (destroyed || !active) return;
      timer.reset(0); generation++; active = false; mode = null; status = "idle"; title = ""; index = 0; steps = []; ids.clear(); revealed.clear(); presentation = undefined; hidden = undefined; present([], true); notify();
    },
    /** Releases timers, transient state and observers once. */
    destroy() { if (destroyed) return; player.close(); timer.pause(); destroyed = true; generation++; listeners.clear(); },
  };
  return player;
}
