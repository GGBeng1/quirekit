import type { FlowchartDocument, FlowchartPlayback, FlowchartPlaybackPatch } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import { createRunRenderer } from "../render";
import { createMotionScene } from "../motion/scene";
import { createPlaybackSceneView } from "./view";

/** @param runtime - Exact drawing owner. @returns The ordinary state/cue ports over this graph. */
function ports(runtime: FlowRuntime) { return { renderer: createRunRenderer(runtime), scene: createMotionScene(runtime) }; }

/** @param owner - Unchanged authoring graph. @param player - Current logical controller. @returns Stable animation ports that can switch to a private scene graph. */
export function createPlaybackPresentation(owner: FlowRuntime, player: FlowchartPlayback) {
  const authored = ports(owner);
  let current = authored, view: ReturnType<typeof createPlaybackSceneView> | undefined;
  /** Releases only the transient graph, leaving the original renderer available. */
  function closeScene(): void {
    if (!view) return;
    current.scene.destroy(); current.renderer.destroy(); view.destroy(); view = undefined; current = authored;
  }
  return {
    /** @param patch - Accepted diagram/state/cue boundary. Uses one scene lifetime and retains unchanged native cells. */
    apply(patch: FlowchartPlaybackPatch): void {
      if (patch.scene === null) closeScene();
      if (patch.scene) {
        if (!view) {
          authored.scene.apply({ reset: true, changes: [] }); authored.renderer.apply({ reset: true, changes: [] });
          const documents = player.getTrace().steps.flatMap(step => step.scene ? [step.scene] : []);
          view = createPlaybackSceneView(owner, documents); current = ports(view.runtime);
        }
        const document: FlowchartDocument = patch.scene;
        if (patch.reset) view.apply(patch.sceneFrom ?? owner.options.document, true, 1, () => {
          current.scene.apply({ reset: true, changes: [] }); current.renderer.apply({ reset: true, changes: [] });
        });
        view.apply(document, false, patch.sceneDuration ?? 1200, () => {
          current.scene.apply({ reset: true, changes: [] }); current.renderer.apply({ reset: true, changes: [] });
        });
        // New views and changed geometry need the complete addressed state once at
        // this boundary. The core still publishes sparse updates during ordinary cues.
        const changes = [...document.nodes, ...document.edges].flatMap(cell => {
          const state = player.getTargetState(cell.id); return state ? [{ id: cell.id, state }] : [];
        });
        current.renderer.apply({ ...patch, reset: true, changes }); current.scene.apply({ ...patch, reset: true, changes });
        view.decorate([...current.renderer.targetElements(), ...current.scene.targetElements()]);
      } else { view?.settle(); current.renderer.apply(patch); current.scene.apply(patch); }
    },
    /** @param progress - Logical fraction. @param duration - Step length. @param reduced - Completed poses. */
    frame(progress: number, duration: number, reduced: boolean): void { current.scene.frame(progress, duration, reduced); view?.frame(progress, duration, reduced); },
    /** @param phase - Retained connector dash phase. */ phase(phase: number): void { current.renderer.phase(phase); },
    /** @returns Whether active state overlays need continuous sampling. */ hasFlow: () => current.renderer.hasFlow(),
    /** @returns Whether current cues or scene changes require frame sampling. */ hasAnimation: () => current.scene.hasAnimation() || (view?.hasAnimation() ?? false),
    /** Reprojects an accepted scene on a theme/locale boundary without changing time. */
    refresh(): void { view?.refresh(); current.renderer.refresh(); current.scene.refresh(); },
    /** Releases both ordinary and scene presentation lifetimes. */
    destroy(): void { closeScene(); authored.scene.destroy(); authored.renderer.destroy(); },
  };
}
