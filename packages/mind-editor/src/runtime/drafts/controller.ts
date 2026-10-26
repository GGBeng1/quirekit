import type { MindMapEditor } from "@quirekit/mind-map-simple";
import type { MindEditorDrafts } from "./types";

/**
 * Publishes the same draft-aware save boundary to Vue handles and host consumers.
 * @param editor - Owned adapter; native input keeps its existing authority.
 * @param drafts - Small captured property patches.
 * @returns Controller whose explicit mutations and snapshots first drain drafts.
 */
export function bindMindEditorDrafts(editor: MindMapEditor, drafts: MindEditorDrafts): MindMapEditor {
  return {
    ...editor,
    /** @returns Complete source including pending property fields. */
    async getDocument() { await drafts.settled(); return editor.getDocument(); },
    /** @returns Same-version SVG after pending fields are committed. */
    async exportSvg() { await drafts.settled(); return editor.exportSvg(); },
    /** @param command - Explicit toolbar intent. @returns Serialized field then command completion. */
    async execute(command) { await drafts.settled(); return editor.execute(command); },
    /** @param document - Replacement source. @returns Undoable replacement after preserving the old form. */
    async replaceDocument(document) { await drafts.settled(); return editor.replaceDocument(document); },
    /** @param id - Captured branch. @returns Folding after pending property publication. */
    async focusBranch(id) { await drafts.settled(); return editor.focusBranch(id); },
    /** @param layout - Canonical arrangement. @returns Layout completion after pending properties. */
    async setLayout(layout) { await drafts.settled(); return editor.setLayout(layout); },
    /** @param patch - Explicit formatting. @returns One source formatting mutation. */
    async format(patch) { await drafts.settled(); return editor.format(patch); },
    /** @param patch - Explicit content fields. @param ids - Captured topic identities. @returns Content completion. */
    async setDetails(patch, ids) { await drafts.settled(); return editor.setDetails(patch, ids); },
    /** @param value - Semantic object. @returns Annotation completion. */
    async putAnnotation(value) { await drafts.settled(); return editor.putAnnotation(value); },
    /** @param id - Annotation identity. @returns Removal completion after preserving its property history. */
    async removeAnnotation(id) { await drafts.settled(); return editor.removeAnnotation(id); },
  };
}
