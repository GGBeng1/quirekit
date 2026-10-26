import { shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import type { BlockContainerTarget } from "./types";
const sessions = new WeakMap<Editor, ReturnType<typeof createSession>>();
/** @param editor - Canonical owner. @returns Explicit task shared by node headers and block menus. */
function createSession(editor: Editor) {
  const target = shallowRef<BlockContainerTarget | null>(null);
  /** Discards drafts without changing content. */
  function close(): void { target.value = null; }
  /** @param position - Exact container boundary. @param mode - Requested control. */
  function open(position: number, mode: BlockContainerTarget["mode"] = "settings"): void {
    if (!editor.isEditable || position < 0 || position >= editor.state.doc.content.size) return;
    const node = editor.state.doc.nodeAt(position);
    if (node?.type.name !== "blockContainer") return;
    editor.commands.setNodeSelection(position);
    target.value = { node, doc: editor.state.doc, position, mode };
  }
  return { target, open, close };
}
/** @param editor - Owning session. @returns The single document-local container task. */
export function useBlockContainerScope(editor: Editor) {
  let scope = sessions.get(editor);
  if (!scope) { scope = createSession(editor); sessions.set(editor, scope); }
  return scope;
}
