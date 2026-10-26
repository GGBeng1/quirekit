import type { QuireEditor } from "@quirekit/core";
import { resolveQuireDocumentProfile, type QuireDrawingModelProfile } from "@quirekit/view-engine";

/**
 * Reads the drawing model registered for an editor's document profile.
 * @param editor - Editor owning the document.
 * @returns Drawing model; the neutral model anchors no drawing objects.
 */
export function readMountedDrawingModel(editor: QuireEditor): QuireDrawingModelProfile {
  return resolveQuireDocumentProfile(editor.extensionManager).drawingModel;
}
