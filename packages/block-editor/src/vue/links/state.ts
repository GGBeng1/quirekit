import { ref, shallowRef } from "vue";
import type { Editor } from "@quirekit/core";
import { captureBlockLink } from "../../links/commands";
import type { BlockLinkTarget } from "../../links/types";
import { suspendBlockObjectToolbars } from "../objects/ownership";

const sessions = new WeakMap<Editor, ReturnType<typeof createSession>>();
/** @param editor - One document owner. @returns Shared explicit task state with no idle document subscription. */
function createSession(editor: Editor) {
  const target = shallowRef<BlockLinkTarget | null>(null);
  const editing = ref(false);
  let releaseTools: (() => void) | undefined;
  /** Releases the source lease without changing document focus or selection. */
  function close(): void { target.value = null; editing.value = false; releaseTools?.(); releaseTools = undefined; }
  /** @param edit - Whether this is an explicit editing request. */
  function open(edit = true): void {
    if (edit && !editor.isEditable) return;
    close();
    const source = captureBlockLink(editor);
    if (!source) return;
    if (source.range) editor.commands.setTextSelection(source.range);
    editing.value = edit; target.value = captureBlockLink(editor);
    if (target.value) releaseTools = suspendBlockObjectToolbars(editor);
  }
  return { target, editing, close, open };
}
/** @param editor - Document owner. @returns One shared session for body, toolbar, shortcut and selection bar. */
export function useBlockLinkScope(editor: Editor) {
  let scope = sessions.get(editor);
  if (!scope) { scope = createSession(editor); sessions.set(editor, scope); }
  return scope;
}
