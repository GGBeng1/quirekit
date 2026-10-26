import { readFlowchart } from "../model/document";
import type { FlowchartDocument, FlowchartNode } from "../model/types";
import { assertFlowchartUnlocked } from "../objects/selection";
import { readFlowchartImage } from "./image";
import type { FlowchartImage } from "./types";

/** @param document - Current canonical source. @param id - Target image node. @param image - Replacement content. @param expected - Optional opening snapshot. @returns Guarded replacement retaining geometry and connections. */
export function updateFlowchartImage(document: FlowchartDocument, id: string, image: FlowchartImage, expected?: FlowchartNode): FlowchartDocument {
  const node = document.nodes.find(n => n.id === id);
  if (!node || node.shape !== "image") throw new Error("请选择图片节点");
  if (expected) {
    const opening = readFlowchart({ ...document, nodes: document.nodes.map(n => n.id === id ? expected : n) }).nodes.find(n => n.id === id);
    if (JSON.stringify(node) !== JSON.stringify(opening)) throw new Error("图形已更新，请重新打开编辑");
  }
  assertFlowchartUnlocked(document, [id]);
  image = readFlowchartImage(image);
  return readFlowchart({ ...document, nodes: document.nodes.map(n => n.id === id ? { ...n, image } : n) });
}
