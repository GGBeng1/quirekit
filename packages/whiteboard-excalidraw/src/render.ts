import type { ExcalidrawElement } from "@excalidraw/excalidraw/element/types";
import { readWhiteboardScene, type WhiteboardScene, type WhiteboardSceneRenderer } from "@quirekit/whiteboard";
import { snapshotScene } from "./snapshot";

/**
 * Renders without mounting a second editor or reading the active canvas.
 * @param owner - Explicit browser document owning font/canvas resources.
 * @returns Lazy native-scene normalization and matching PNG preparation.
 */
export function createWhiteboardSceneRenderer(owner: Document): WhiteboardSceneRenderer {
  return async (input: WhiteboardScene) => {
    const scene = readWhiteboardScene(input);
    const { restoreElements, exportToCanvas } = await import("@excalidraw/excalidraw");
    await owner.fonts?.ready;
    const elements = restoreElements(scene.elements as unknown as ExcalidrawElement[], null, { refreshDimensions: true, repairBindings: true });
    const originals = new Map(scene.elements.map(element => [element.id, element]));
    const normalized = readWhiteboardScene({ ...scene, elements: JSON.parse(JSON.stringify(elements.map(element => ({ ...originals.get(element.id), ...element })))) });
    return snapshotScene(normalized, owner, exportToCanvas);
  };
}
