import type { QuireEditor } from "@quirekit/core";
import type { QuireDecorationSourceView } from "../decorations";

/**
 * Creates a targetless decoration source backed by canonical editor plugins.
 *
 * The adapter exposes the ProseMirror state expected by decoration providers
 * while retaining the editor's normal prop ordering. Callers must still choose
 * an explicit decoration scope for export or other non-mounted frames.
 *
 * @param editor - Canonical editor whose plugin props should be exposed.
 * @returns Targetless decoration-source facade.
 */
export function createQuireEditorDecorationSourceView(
  editor: QuireEditor
): QuireDecorationSourceView {
  return {
    get state() {
      return editor.state.pm;
    },
    someProp(propName, consume) {
      if (propName !== "decorations") return undefined;
      return editor.someProp("decorations", (provider) => consume(provider));
    }
  };
}
