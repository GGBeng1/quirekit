import { onBeforeUnmount, shallowRef, watch, type Ref } from "vue";
import type { Editor } from "@quirekit/core";
import { prepareEditorBlockMenu, type EditorBlockMenuSession } from "@quirekit/editor-ui";
import type { BlockActionTarget } from "../../ui/blocks/types";

/** @param editor - Menu owner. @param target - Captured structural target. @param visible - Open menu state. @returns One revocable feature snapshot per opening. */
export function useBlockMenuContext(editor: Editor, target: Ref<BlockActionTarget | null>, visible: () => boolean) {
  const session = shallowRef<EditorBlockMenuSession | null>(null);
  watch([target, visible], () => {
    session.value?.dispose();
    session.value = target.value?.blocks.length === 1 && visible() ? prepareEditorBlockMenu(editor, target.value.block.from) : null;
  }, { flush: "sync" });
  onBeforeUnmount(() => session.value?.dispose());
  return session;
}
