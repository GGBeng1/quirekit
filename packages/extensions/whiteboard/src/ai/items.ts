import type { Node } from "@quirekit/pm";
import type { QuireAiBlockItem } from "@quirekit/ai-contract";
import { whiteboardRecord, type WhiteboardDocument } from "@quirekit/whiteboard";
import { readWhiteboardNode } from "../source";

const cache = new WeakMap<WhiteboardDocument, readonly QuireAiBlockItem[]>();

/** @param node - Immutable source atom. @returns Native items with bound labels, omitting binary and private data. */
export function whiteboardItems(node: Node): readonly QuireAiBlockItem[] {
  const board = readWhiteboardNode(node);
  return board ? whiteboardBoardItems(board) : [];
}

/** @param board - Validated board, wherever the document stores it. @returns Native items with bound labels, omitting binary and private data. */
export function whiteboardBoardItems(board: WhiteboardDocument): readonly QuireAiBlockItem[] {
  const cached = cache.get(board); if (cached) return cached;
  const visible = board.scene.elements.filter(element => !element.isDeleted);
  const labels = new Map(visible.filter(element => element.type === "text" && element.containerId).map(element => [element.containerId, element.text]));
  const items = visible.filter(element => element.type !== "text" || !element.containerId).map(element => {
    const label = element.type === "text" ? element.text : labels.get(element.id);
    const properties: Record<string, string | number | boolean | null> = {};
    for (const key of ["type", "x", "y", "width", "height"]) {
      const value = element[key];
      if (typeof value === "number" || typeof value === "string") properties[key] = value;
    }
    if (element.type === "arrow") for (const [key, binding] of [["from", element.startBinding], ["to", element.endBinding]] as const) {
      if (whiteboardRecord(binding) && typeof binding.elementId === "string") properties[key] = binding.elementId;
    }
    return { id: String(element.id), ...(typeof label === "string" ? { label } : {}), properties };
  });
  cache.set(board, items); return items;
}
