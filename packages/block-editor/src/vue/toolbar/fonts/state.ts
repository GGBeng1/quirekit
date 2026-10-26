import { ref } from "vue";
import type { Editor } from "@quirekit/core";
import type { BlockFontTarget } from "./types";
const sessions = new WeakMap<Editor, ReturnType<typeof createSession>>();
/** @returns UI-only scope shared by both toolbars of one document. */
function createSession() { return { target: ref<BlockFontTarget>("all"), dialog: ref(false) }; }
/** @param editor - Document owner. @returns Stable toolbar scope without another editor subscription. */
export function useBlockFontScope(editor: Editor) {
  let session = sessions.get(editor);
  if (!session) { session = createSession(); sessions.set(editor, session); }
  return session;
}
/** @param editor - Command owner. @param target - Script slot. @param family - Exact family or empty to inherit. @returns Canonical formatting completion. */
export function setBlockFont(editor: Editor, target: BlockFontTarget, family: string): boolean {
  if (!editor.isEditable || /[;{}<>]/u.test(family)) return false;
  const chain = editor.chain();
  if (target === "eastAsia") return family ? chain.setEastAsiaFontFamily(family).run() : chain.unsetEastAsiaFontFamily().run();
  if (target === "latin") return family ? chain.setLatinFontFamily(family).run() : chain.unsetLatinFontFamily().run();
  if (target === "complexScript") return family ? chain.setComplexScriptFontFamily(family).run() : chain.unsetComplexScriptFontFamily().run();
  return family ? chain.setFontFamily(family).run() : chain.unsetFontFamily().run();
}
