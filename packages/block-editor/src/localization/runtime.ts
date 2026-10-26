import type { Editor } from "@quirekit/core";
import type { BlockEditorLocale, BlockLocaleListener } from "./types";

const sessions = new WeakMap<Editor, { locale: BlockEditorLocale; listeners: Set<BlockLocaleListener> }>();

/** @param editor - Canonical session. @returns Its presentation state, without a document transaction. */
function session(editor: Editor) {
  let value = sessions.get(editor);
  if (!value) {
    value = { locale: "zh-CN", listeners: new Set() };
    sessions.set(editor, value);
    editor.on("destroy", () => { value!.listeners.clear(); sessions.delete(editor); });
  }
  return value;
}

/** @param editor - Canonical session. @returns This instance's current interface language. */
export function readBlockEditorLocale(editor: Editor): BlockEditorLocale { return sessions.get(editor)?.locale ?? "zh-CN"; }

/** @param editor - Canonical session. @param locale - Bundled language; never modifies canonical content or history. */
export function setBlockEditorLocale(editor: Editor, locale: BlockEditorLocale): void {
  if (editor.isDestroyed) return;
  const state = session(editor);
  if (state.locale === locale) return;
  state.locale = locale;
  for (const listener of state.listeners) listener(locale);
}

/** @param editor - Canonical session. @param listener - Presentation-only consumer. @returns Subscription release. */
export function onBlockEditorLocaleChange(editor: Editor, listener: BlockLocaleListener): () => void {
  if (editor.isDestroyed) return () => {};
  const state = session(editor);
  state.listeners.add(listener);
  return () => state.listeners.delete(listener);
}
