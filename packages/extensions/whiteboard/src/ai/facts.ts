import type { QuireAiCapability } from "@quirekit/ai-contract";
import type { WhiteboardDocument } from "@quirekit/whiteboard";
import { readWhiteboardNode } from "../source";
import { whiteboardBoardItems, whiteboardItems } from "./items";

/** The source, never the PNG or embedded bytes, explains what the model can edit. */
export const whiteboardAiCapabilities: readonly QuireAiCapability[] = [{
  kind: "block", node: "whiteboard",
  items: whiteboardItems,
  /** @param node - Immutable document atom. @returns Bounded native element summary with identities for incremental edits. */
  label(node) {
    const board = readWhiteboardNode(node);
    return board ? whiteboardBoardLabel(board) : "白板：源数据无效";
  },
}];

/**
 * @param board - Validated board, wherever the document stores it.
 * @returns Bounded native element summary with identities for incremental edits.
 */
export function whiteboardBoardLabel(board: WhiteboardDocument): string {
  const items = whiteboardBoardItems(board);
  const entries = items.slice(0, 40).map(item => ({ id: item.id, ...item.properties, ...(item.label ? { label: item.label.slice(0, 160) } : {}) }));
  return `白板 ${JSON.stringify({ id: board.id, revision: board.revision, title: board.title, total: items.length, elements: entries })}`;
}
