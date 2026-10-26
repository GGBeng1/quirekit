import type { Transform } from "@antv/x6";
import { createFlowchartPlayback } from "@quirekit/flowchart";
import type { FlowchartPlaybackState } from "@quirekit/flowchart";
import { createRunAnimation } from "./animation";
import { createPlaybackPresentation } from "./scene/runner";
import { requireIdle } from "../runtime/commands";
import { syncSelectionPermission } from "../runtime/structure/permissions";
import { presentEdgeTools } from "../runtime/presentation";
import { bindFlowLocale } from "../runtime/locale/controls";
import type { FlowRuntime, FlowTextInput } from "../runtime/types";

/** @param runtime - Exact source/viewport lifetime. @param text - Pending input owner. @param cancelFormat - Ends a previously armed authoring tool. @returns Playback port and adapter cleanup. */
export function createFlowPlayback(runtime: FlowRuntime, text: FlowTextInput, cancelFormat: () => void) {
  const { graph, mount } = runtime, document = mount.ownerDocument, window = document.defaultView;
  if (!window) throw new Error("演示需要已挂载的浏览器窗口");
  let motion: ReturnType<typeof createRunAnimation>, presentation: ReturnType<typeof createPlaybackPresentation>;
  const player = createFlowchartPlayback({
    /** @param id - Exact target. @param kind - Required connector for data travel. @returns Whether this graph owns that canonical target. */
    hasTarget(id, kind) { const cell = graph.getCellById(id); return !!cell?.getData()?.source && (!kind || cell.isEdge()); },
    /** Completes native editing before transient playback takes ownership. */
    beforeEnter() { requireIdle(runtime, text); cancelFormat(); },
    /** @param patch - Sparse presentation update, including explicit run/prefix resets. */
    onPatch(patch) { presentation.apply(patch); if (patch.reset) motion.reset(); },
    clock: {
      /** @returns Monotonic owner-window time. */ now: () => window.performance.now(),
      /** @param milliseconds - Current dwell. @param callback - One semantic advance. @returns Cancellation of this window's timer. */
      after(milliseconds, callback) { const timer = window.setTimeout(callback, milliseconds); return () => window.clearTimeout(timer); },
    },
  });
  presentation = createPlaybackPresentation(runtime, player);
  motion = createRunAnimation(runtime, presentation, presentation, player);
  const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
  /** Projects the owner's current system motion preference. */
  function reduceMotion(): void { player.setReducedMotion(preference.matches); }
  /** Stops semantic and animation progression when the owning page is hidden. */
  function visibility(): void { if (document.hidden) player.pause(); }
  reduceMotion(); preference.addEventListener("change", reduceMotion); document.addEventListener("visibilitychange", visibility);
  /** Reprojects addressed states and actors at a theme or language boundary, retaining their logical progress. */
  const refresh = () => presentation.refresh();
  const removeLocale = bindFlowLocale(runtime, refresh);
  /** @param state - Semantic boundary; authoring UI is invalidated only on entry/exit. */
  function changed(state: FlowchartPlaybackState): void {
    if (document.hidden && (state.status === "playing" || state.status === "waiting")) { player.pause(); return; }
    if (runtime.presenting !== state.active) {
      runtime.presenting = state.active;
      if (state.active) mount.dataset.flowPresenting = ""; else delete mount.dataset.flowPresenting;
      syncSelectionPermission(runtime);
      const transform = graph.getPlugin<Transform>("transform"); transform?.clearWidgets();
      for (const cell of graph.getSelectedCells()) {
        if (cell.isEdge()) presentEdgeTools(cell, runtime);
        else if (!state.active && cell.isNode()) transform?.createWidget(cell);
      }
      runtime.notify();
    }
    motion.sync(state);
  }
  const removeState = player.subscribe(changed);
  return { controller: player, refreshAppearance: refresh,
    /** Releases run state and every timer/RAF/listener before the graph lifetime ends. */
    destroy(): void {
      preference.removeEventListener("change", reduceMotion); document.removeEventListener("visibilitychange", visibility); removeLocale();
      player.destroy(); removeState(); motion.destroy(); presentation.destroy();
    },
  };
}
