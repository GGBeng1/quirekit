import type { VNodeChild } from "vue";
import { parseWhiteboard, whiteboardPreviewSize } from "@quirekit/whiteboard";
import { diagramFigure } from "./diagram-figure";

/** @param source - Confirmed fence body. @returns Inert saved preview, or undefined so invalid source stays readable. */
export function renderWhiteboardPreview(source: string): VNodeChild | undefined {
  try {
    const board = parseWhiteboard(source);
    return diagramFigure("data-qk-whiteboard", board.title, board.preview, whiteboardPreviewSize(board.preview).width);
  } catch { return undefined; }
}
