import { WhiteboardError } from "./error";
import type { WhiteboardDocument, WhiteboardPreview, WhiteboardScene } from "./types";
import { readWhiteboardDocument, whiteboardMaximumBytes } from "./validation";

/** @param id - Host-created unique identity. @param title - Plain title. @returns Empty portable board. */
export function createWhiteboardDocument(id: string, title = "未命名白板"): WhiteboardDocument {
  return readWhiteboardDocument({ type: "quirekit-whiteboard", version: 1, id, revision: 0, title, preview: null,
    scene: { type: "excalidraw", version: 2, source: "quirekit", elements: [], appState: { viewBackgroundColor: "#ffffff" }, files: {} } });
}

/** @param text - Encoded envelope. @returns Validated detached source or a diagnostic exception. */
export function parseWhiteboard(text: string): WhiteboardDocument {
  if (text.length > whiteboardMaximumBytes) throw new WhiteboardError("tooLarge", "白板超过 16 MB");
  return readWhiteboardDocument(JSON.parse(text));
}

/** @param document - Editable source. @returns Canonical compact JSON safe inside a Markdown fence. */
export function serializeWhiteboard(document: WhiteboardDocument): string {
  return JSON.stringify(readWhiteboardDocument(document)).replace(/`/gu, "\\u0060");
}

/** @param original - Captured baseline. @param scene - Frozen edited source. @param preview - Matching snapshot. @param title - Current title.
 * @returns One proposed revision; only the host's atomic commit publishes it. */
export function prepareWhiteboardSave(original: WhiteboardDocument, scene: WhiteboardScene, preview: WhiteboardPreview, title = original.title): WhiteboardDocument {
  return readWhiteboardDocument({ ...original, revision: original.revision + 1, title, scene, preview });
}
