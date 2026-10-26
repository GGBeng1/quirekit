import type { Graph } from "@antv/x6";
import type { FlowchartDocument } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { playbackSceneBounds } from "./bounds";
import { applySceneContent } from "./content";
import { createSceneTransition } from "./transition";

/** @param owner - Authoring graph and viewport authority. @param documents - Validated diagrams for one run. @returns An isolated presentation graph, never consulted by source/history/export. */
export function createPlaybackSceneView(owner: FlowRuntime, documents: readonly FlowchartDocument[]) {
  const mount = owner.mount.ownerDocument.createElement("div");
  mount.dataset.flowSceneSurface = "";
  Object.assign(mount.style, { position: "absolute", inset: "0", background: owner.appearance.surface, overflow: "hidden" });
  const style = owner.mount.ownerDocument.createElement("style");
  style.textContent = "[data-flow-scene-surface] .x6-port { visibility: hidden; pointer-events: none; }";
  owner.mount.append(mount);
  // The author's initialized constructor keeps vendor loading at the existing
  // async mount boundary, rather than making the adapter's import browser-only.
  const SceneGraph = owner.graph.constructor as typeof Graph;
  const graph = new SceneGraph({ container: mount, async: false, autoResize: false, interacting: false, panning: false, mousewheel: false, grid: false });
  mount.append(style);
  const runtime: FlowRuntime = { ...owner, graph, mount, readOnly: true, presenting: true, localeListeners: new Set(),
    /** Scene updates never notify the authoring host. */ notify(): void {},
    /** Scene connectors use their accepted routes without authoring invalidation. */ refreshCrossings(): void {},
  };
  const bounds = playbackSceneBounds(documents), transition = createSceneTransition(runtime);
  const originalScale = owner.graph.scale(), originalTranslation = owner.graph.translate(), originalFit = owner.presentationFit;
  let source: FlowchartDocument | undefined, length = 1200;
  /** Copies only the author's viewport transform, with no source reads. */
  function camera(): void { const scale = owner.graph.scale(), translation = owner.graph.translate(); graph.scale(scale.sx, scale.sy); graph.translate(translation.tx, translation.ty); }
  /** Fits the fixed union of this run, rather than the current step's changing bounds. */
  function fit(): void {
    const width = owner.mount.clientWidth, height = owner.mount.clientHeight;
    if (!width || !height || owner.destroyed) return;
    graph.resize(width, height);
    const padding = 20, scale = Math.max(.1, Math.min(1, (width - padding * 2) / bounds.width, (height - padding * 2) / bounds.height));
    owner.graph.scale(scale, scale);
    owner.graph.translate((width - bounds.width * scale) / 2 - bounds.x * scale, padding - bounds.y * scale);
    camera();
  }
  /** @returns Whether this view handled the public fit command. */
  function presentationFit(): boolean { fit(); return true; }
  owner.presentationFit = presentationFit;
  owner.graph.on("scale", camera); owner.graph.on("translate", camera);
  const resize = new ResizeObserver(fit); resize.observe(owner.mount); fit();
  return { runtime, fit, decorate: transition.decorate,
    /** @param next - Accepted scene. @param immediate - Completed prefix pose. @param duration - Logical transition length. @param release - Clears old cue ownership after visual captures. */
    apply(next: FlowchartDocument, immediate: boolean, duration: number, release: () => void): void {
      length = duration;
      transition.apply(source, next, () => { release(); applySceneContent(runtime, next); }, immediate);
      source = next;
    },
    /** @param progress - Current logical progress. @param duration - Step duration. @param reduced - Completed visual pose. */
    frame(progress: number, duration: number, reduced: boolean): void { transition.frame(progress, duration, length, reduced); },
    /** Finalizes the accepted diagram before another semantic event. */ settle(): void { transition.settle(); },
    /** @returns Whether cached scene actors require frame sampling. */ hasAnimation: () => transition.hasAnimation(),
    /** Recompiles theme/locale only at its semantic boundary. */
    refresh(): void { runtime.appearance = owner.appearance; runtime.locale = owner.locale; mount.style.background = owner.appearance.surface; if (source) applySceneContent(runtime, source, true); },
    /** Restores authoring navigation and releases every private resource. */
    destroy(): void {
      resize.disconnect(); owner.graph.off("scale", camera); owner.graph.off("translate", camera);
      if (owner.presentationFit === presentationFit) { if (originalFit) owner.presentationFit = originalFit; else delete owner.presentationFit; }
      transition.destroy(); graph.dispose(); mount.remove();
      if (!owner.destroyed) { owner.graph.scale(originalScale.sx, originalScale.sy); owner.graph.translate(originalTranslation.tx, originalTranslation.ty); }
    },
  };
}
