import { prepareWhiteboardSave } from "../document";
import { readWhiteboardDocument, readWhiteboardScene } from "../validation";
import type { WhiteboardDocument, WhiteboardScene } from "../types";
import { bindingId, putNode, touchElement } from "./elements";
import { putEdge, reconcileBindings } from "./edges";
import { readWhiteboardDiagramPatch } from "./validate";
import type { DiagramElement, WhiteboardDiagramPatch, WhiteboardSceneRenderer } from "./types";

/** @param original - Current scene. @param input - Explicit incremental edit. @returns Detached native scene; original is never mutated. */
export function editWhiteboardScene(original: WhiteboardScene, input: WhiteboardDiagramPatch): WhiteboardScene {
  const patch = readWhiteboardDiagramPatch(input);
  const scene = JSON.parse(JSON.stringify(readWhiteboardScene(original))) as WhiteboardScene;
  const elements = new Map((scene.elements as DiagramElement[]).map(element => [element.id, element]));
  // Remove dependencies to keep arrow/text bindings valid without touching
  // unrelated native geometry, freehand strokes, groups or binary files.
  const removed = new Set(patch.remove ?? []);
  for (const id of removed) if (!elements.has(id)) throw new Error(`白板元素 ${id} 不存在`);
  for (const element of elements.values()) if (element.type === "arrow"
    && [bindingId(element.startBinding), bindingId(element.endBinding)].some(id => id && removed.has(id))) removed.add(element.id);
  for (const element of elements.values()) if (typeof element.containerId === "string" && removed.has(element.containerId)) removed.add(element.id);
  for (const id of removed) elements.delete(id);
  for (const element of elements.values()) if (typeof element.frameId === "string" && removed.has(element.frameId)) {
    element.frameId = null; touchElement(element);
  }
  // Only geometric changes invalidate routing. Text/color edits must preserve
  // the user's intermediate path points and native binding order.
  const geometry = new Set<string>();
  (patch.nodes ?? []).forEach((node, index) => {
    const previous = elements.get(node.id);
    if (!previous || (["x", "y", "width", "height"] as const).some(key => node[key] !== undefined && node[key] !== previous[key])) geometry.add(node.id);
    putNode(elements, node, index);
  });
  (patch.edges ?? []).forEach(edge => {
    const previous = elements.get(edge.id);
    if (!previous || bindingId(previous.startBinding) !== edge.from || bindingId(previous.endBinding) !== edge.to) geometry.add(edge.id);
    putEdge(elements, edge);
  });
  reconcileBindings(elements, geometry);
  return readWhiteboardScene({ ...scene, elements: [...elements.values()] });
}

/**
 * Freezes source before explicit asynchronous resource preparation. The caller
 * publishes only after rechecking its captured source identity and permissions.
 * @param original - Captured source baseline.
 * @param input - Nodes, connections, deletion and title changes.
 * @param render - Explicit host rendering capability.
 * @returns Proposed next revision with a matching source/PNG pair.
 */
export async function prepareWhiteboardDiagram(original: WhiteboardDocument, input: WhiteboardDiagramPatch,
  render: WhiteboardSceneRenderer): Promise<WhiteboardDocument> {
  const baseline = readWhiteboardDocument(original), patch = readWhiteboardDiagramPatch(input);
  const result = await render(editWhiteboardScene(baseline.scene, patch));
  return prepareWhiteboardSave(baseline, result.scene, result.preview, patch.title ?? baseline.title);
}
