import { Plugin, PluginKey } from "@quirekit/pm";
import { resolveWordDocumentStyleRegistry } from "./model/theme/context";
import type { WordStylesStorage } from "./types";

const wordStylesRuntimePluginKey = new PluginKey<null>(
  "wordStylesRuntimeRegistry"
);

/**
 * Synchronizes the document style registry before mounted views process state.
 *
 * ProseMirror plugin state is applied while the next editor state is built,
 * before mounted Canvas/SVG/HTML views receive that state. This prevents one
 * stale layout frame after a document-attribute-only named-style update.
 *
 * @param storage - Mutable resolver storage shared by visual backends.
 * @returns ProseMirror plugin owning pre-view registry synchronization.
 */
export function createWordStylesRuntimePlugin(
  storage: WordStylesStorage
): Plugin<null> {
  return new Plugin<null>({
    key: wordStylesRuntimePluginKey,
    state: {
      init(_configuration, state) {
        storage.registry = resolveWordDocumentStyleRegistry(state.doc.attrs);
        return null;
      },
      apply(_transaction, value, oldState, newState) {
        if (
          oldState.doc.attrs !== newState.doc.attrs
        ) {
          storage.registry = resolveWordDocumentStyleRegistry(newState.doc.attrs);
        }
        return value;
      }
    }
  });
}
