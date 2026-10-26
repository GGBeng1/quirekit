import type { Editor } from "@quirekit/core";
import { bindBlockNodeLocale, blockEditorText } from "./node-view";
import { readBlockEditorLocale } from "./runtime";

/** @param editor - Session whose view uses this host. @param host - Caller-owned mount. @returns Restore host presentation and release the locale subscription. */
export function bindBlockHostLocale(editor: Editor, host: HTMLElement): () => void {
  const previous = host.getAttribute("lang");
  const messages = { "--qk-block-writing-placeholder": "输入 / 插入内容块", "--qk-block-note-broken": "引用失效", "--qk-block-note-unreferenced": "未引用" };
  const styles = Object.keys(messages).map(key => [key, host.style.getPropertyValue(key)] as const);
  const release = bindBlockNodeLocale(editor, () => {
    host.lang = readBlockEditorLocale(editor);
    for (const [key, message] of Object.entries(messages)) host.style.setProperty(key, JSON.stringify(blockEditorText(editor, message)));
  });
  return () => {
    release();
    if (previous === null) host.removeAttribute("lang"); else host.lang = previous;
    for (const [key, value] of styles) { if (value) host.style.setProperty(key, value); else host.style.removeProperty(key); }
  };
}
