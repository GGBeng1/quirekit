import type { FlowchartPlaybackState } from "@quirekit/flowchart";
import type { FlowRuntime } from "../runtime/types";
import type { createRunRenderer } from "./render";
import type { createMotionScene } from "./motion/scene";
import type { FlowchartPlayback } from "@quirekit/flowchart";

/** @param runtime - Vendor graph owner. @param renderer - State phase sink. @param scene - Data actors. @param player - Logical time authority. @returns One X6 clock, detached from source and history. */
export function createRunAnimation(runtime: FlowRuntime, renderer: Pick<ReturnType<typeof createRunRenderer>, "phase" | "hasFlow">, scene: Pick<ReturnType<typeof createMotionScene>, "frame" | "hasAnimation">, player: FlowchartPlayback) {
  // This Cell never enters the graph model. animate's property writes cannot
  // reach portable source, history, content callbacks or routing subscriptions.
  const clock = runtime.graph.createNode({ qkFlowPhase: 0 });
  let animation: ReturnType<typeof clock.animate> | undefined, rate = 1, duration = 1200, reduced = false;
  /** @param phase - Vendor numeric property update. */
  function tick(phase: { current: unknown }): void { if (typeof phase.current === "number" && Number.isFinite(phase.current)) { renderer.phase(phase.current); scene.frame(player.getProgress(), duration, reduced); } }
  clock.on("change:qkFlowPhase", tick);
  return {
    /** Resets seek/replay phase independently of theme-only overlay reconstruction. */
    reset(): void { animation?.cancel(); animation = undefined; clock.setProp("qkFlowPhase", 0); renderer.phase(0); },
    /** @param state - Semantic pause/rate/motion boundary. */
    sync(state: FlowchartPlaybackState): void {
      duration = state.current?.duration ?? 1200; reduced = state.reducedMotion; scene.frame(player.getProgress(), duration, reduced);
      if (reduced) renderer.phase(0);
      if (!state.active || reduced || state.status !== "playing" || (!renderer.hasFlow() && !scene.hasAnimation())) { animation?.pause(); return; }
      if (!animation) { animation = clock.animate({ qkFlowPhase: [0, 1] }, { duration: 900, iterations: Infinity }); animation.updatePlaybackRate(state.rate); rate = state.rate; }
      if (rate !== state.rate) { rate = state.rate; animation.updatePlaybackRate(rate); }
      animation.play();
    },
    /** Cancels vendor RAF work without writing a source Cell or publishing another frame. */
    destroy(): void { clock.off("change:qkFlowPhase", tick); animation?.cancel(); clock.dispose(); },
  };
}
