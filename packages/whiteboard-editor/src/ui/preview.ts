import { whiteboardPreviewSource, type WhiteboardDocument } from "@quirekit/whiteboard";

/** @param owner - Active browser document. @param board - Validated saved source. @returns Whether a preview download started. */
export function downloadWhiteboardPreview(owner: Document, board: WhiteboardDocument): boolean {
  const source = whiteboardPreviewSource(board);
  if (!source) return false;
  const link = owner.createElement("a");
  link.href = source;
  link.download = `${board.title.replace(/[\\/:*?"<>|]/g, "_")}.png`;
  link.click();
  return true;
}
