import type { FlowchartMotionPatch, FlowchartPlaybackPatch } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { motionActor } from "./actors";
import { createMotionVisibility } from "./visibility";
import type { MotionActor } from "./types";
import type { PlaybackTargetElement } from "../types";

/** @param runtime - One graph lifetime. @returns Sparse transient choreography and exact source-view restoration. */
export function createMotionScene(runtime: FlowRuntime) {
  const layer = runtime.mount.ownerDocument.createElementNS("http://www.w3.org/2000/svg", "g"), visibility = createMotionVisibility(runtime), lines = createMotionVisibility(runtime, "line");
  layer.dataset.flowRunLayer = ""; layer.dataset.flowMotionLayer = ""; layer.setAttribute("pointer-events", "none"); layer.setAttribute("aria-hidden", "true"); runtime.graph.view.overlay.append(layer);
  let actors: MotionActor[] = [], current: FlowchartMotionPatch | undefined, progress = 0, duration = 1200, reduced = false;
  /** @param finish - Commit an old appear cue's completed visibility at a new semantic boundary. */
  function clearActors(finish: boolean): void {
    if (finish) for (const actor of actors) if (actor.effect.kind === "appear") visibility.set(actor.effect.id, 1);
    layer.replaceChildren(); actors = []; lines.clear();
  }
  /** @param effects - Current semantic choreography. Compiles cached geometry once before animation frame writes. */
  function compile(effects: FlowchartMotionPatch): void {
    actors = effects.effects.flatMap(effect => { const actor = motionActor(runtime, effect, layer, visibility, lines); if (actor?.element) layer.append(actor.element); return actor ? [actor] : []; });
  }
  /** @param value - Current logical position. @param length - Step duration. @param suppress - Reduced-motion preference. Projects only the already-compiled active actors. */
  function frame(value: number, length: number, suppress: boolean): void {
    progress = value; duration = length; reduced = suppress;
    for (const actor of actors) actor.frame(value, length, suppress);
  }
  return { frame,
    /** @param patch - One semantic boundary or explicit prefix reset. */
    apply(patch: FlowchartPlaybackPatch): void {
      clearActors(!patch.reset); current = patch.motion;
      if (patch.reset) visibility.clear();
      if (!current) { delete runtime.mount.dataset.flowMotionMode; return; }
      if (current.presentation === "motion") runtime.mount.dataset.flowMotionMode = ""; else delete runtime.mount.dataset.flowMotionMode;
      if (current.presentation === "motion") for (const change of patch.changes) visibility.set(change.id, change.state === "pending" ? .32 : change.state === "invalid" ? .18 : 1);
      if (current.hidden) for (const id of current.hidden) visibility.set(id, 0);
      for (const id of current.revealed) visibility.set(id, 1);
      compile(current);
    },
    /** @returns Whether the current cue list needs any sampled animation work. */ hasAnimation: () => actors.length > 0,
    /** @returns Current pulse illustrations for composition with a target's scene pose. */ targetElements: (): readonly PlaybackTargetElement[] => actors.flatMap(actor => actor.effect.kind === "pulse" && actor.element ? [{ id: actor.effect.id, element: actor.element }] : []),
    /** Rebuilds active illustrations only at an explicit theme/language boundary, retaining time and visibility. */
    refresh(): void { if (!current) return; clearActors(false); compile(current); frame(progress, duration, reduced); },
    /** Restores original SVG attributes before releasing the graph. */
    destroy(): void { clearActors(false); visibility.clear(); layer.remove(); delete runtime.mount.dataset.flowMotionMode; },
  };
}
