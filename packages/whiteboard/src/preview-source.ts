import type { WhiteboardDocument } from "./types";

/** @param document - Envelope. @returns Image address for display, or null before the first save. */
export function whiteboardPreviewSource(document: Pick<WhiteboardDocument, "preview">): string | null {
  return document.preview?.url ?? document.preview?.dataUrl ?? null;
}
