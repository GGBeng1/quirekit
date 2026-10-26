import type { FlowchartDocument, FlowchartNode } from "@quirekit/flowchart";
import type { FlowRuntime } from "../../runtime/types";
import type { SceneActor } from "./types";
import type { PlaybackTargetElement } from "../types";

/** @param actor - Cached source/accepted geometry. @param progress - Normalized scene transition. @returns World translation composed outside the live view. */
export function sceneActorTransform(actor: Pick<SceneActor, "before" | "after" | "retiring">, progress: number): string {
  const p = Math.max(0, Math.min(1, progress));
  const x = actor.before && actor.after ? (actor.before.x - actor.after.x) * (1 - p) : 0;
  const y = actor.before && actor.after ? (actor.before.y - actor.after.y) * (1 - p) : actor.retiring ? -12 * p : 12 * (1 - p);
  return `translate(${x},${y})`;
}

/** @param runtime - Private presentation graph. @returns Cached scene actors with no graph reads at frame time. */
export function createSceneTransition(runtime: FlowRuntime) {
  const document = runtime.mount.ownerDocument, layer = document.createElementNS("http://www.w3.org/2000/svg", "g");
  layer.dataset.flowSceneGhosts = ""; layer.setAttribute("aria-hidden", "true"); layer.setAttribute("pointer-events", "none"); runtime.graph.view.overlay.append(layer);
  let actors: SceneActor[] = [];
  /** @param progress - Current step progress. @param duration - Current step length. @param length - Accepted scene transition length. @param reduced - Immediately completed pose. */
  function frame(progress: number, duration: number, length: number, reduced: boolean): void {
    const raw = reduced ? 1 : Math.max(0, Math.min(1, progress * duration / Math.max(1, length))), p = raw * raw * (3 - 2 * raw);
    for (const actor of actors) {
      for (const element of [actor.element, ...actor.decorations.map(decoration => decoration.element)]) {
        element.setAttribute("transform", sceneActorTransform(actor, p));
        element.setAttribute("opacity", String(actor.retiring ? 1 - p : actor.entering ? p : 1));
      }
    }
  }
  /** Returns live views to their original parents, removing every retiring copy. */
  function settle(): void {
    for (const actor of actors) {
      for (const decoration of actor.decorations) { if (decoration.content.parentNode === decoration.element) decoration.element.before(decoration.content); decoration.element.remove(); }
      if (actor.content?.parentNode === actor.element) actor.element.before(actor.content); actor.element.remove();
    }
    actors = [];
  }
  /** @param previous - Previous accepted scene. @param next - New accepted scene. @param update - Semantic graph update after captures. @param immediate - Prefix navigation without transition. Captures only changed objects and compiles the new accepted pose. */
  function apply(previous: FlowchartDocument | undefined, next: FlowchartDocument, update: () => void, immediate: boolean): void {
    settle();
    const before = new Map([...previous?.nodes ?? [], ...previous?.edges ?? []].map(cell => [cell.id, cell]));
    const after = new Map([...next.nodes, ...next.edges].map(cell => [cell.id, cell]));
    const moved = new Set(next.nodes.filter(node => { const old = before.get(node.id) as FlowchartNode | undefined; return old && (old.x !== node.x || old.y !== node.y || old.width !== node.width || old.height !== node.height); }).map(node => node.id));
    const changed = new Set([...new Set([...before.keys(), ...after.keys()])].filter(id => {
      const a = before.get(id), b = after.get(id);
      return JSON.stringify(a) !== JSON.stringify(b) || b && "source" in b && [b.source, b.target].some(terminal => "node" in terminal && moved.has(terminal.node));
    }));
    if (!immediate) for (const id of changed) {
      const cell = runtime.graph.getCellById(id), view = cell && runtime.graph.findViewByCell(cell);
      if (view) {
        const element = document.createElementNS("http://www.w3.org/2000/svg", "g"); element.dataset.flowSceneExit = id;
        element.append(view.container.cloneNode(true)); layer.append(element); actors.push({ id, element, decorations: [], retiring: true, entering: false });
      }
    }
    update();
    if (!immediate) for (const id of changed) {
      const cell = runtime.graph.getCellById(id), view = cell && runtime.graph.findViewByCell(cell);
      if (!view) continue;
      const element = document.createElementNS("http://www.w3.org/2000/svg", "g"); element.dataset.flowSceneEnter = id;
      view.container.before(element); element.append(view.container);
      const old = before.get(id), accepted = after.get(id);
      actors.push({ id, element, decorations: [], content: view.container, retiring: false, entering: true,
        ...(old && "shape" in old ? { before: old } : {}), ...(accepted && "shape" in accepted ? { after: accepted } : {}) });
    }
    frame(0, 1, 1, false);
  }
  /** @param targets - Current state/cue elements. Composes an outer pose so cue-owned opacity and transforms are never overwritten. */
  function decorate(targets: readonly PlaybackTargetElement[]): void {
    for (const target of targets) {
      const actor = actors.find(item => !item.retiring && item.id === target.id);
      if (!actor) continue;
      const element = document.createElementNS("http://www.w3.org/2000/svg", "g"); target.element.before(element); element.append(target.element);
      actor.decorations.push({ element, content: target.element });
    }
  }
  return { apply, frame, settle, decorate,
    /** @returns Whether retained transition poses need sampling. */ hasAnimation: () => actors.length > 0,
    /** Releases every transition wrapper without touching the authoring graph. */ destroy(): void { settle(); layer.remove(); },
  };
}
