import type { MsfeEditor } from "@quirekit/msfe-core";

/** Host-supplied document titles, keyed by the mounted source owner. */
const titles = new WeakMap<MsfeEditor, string>();
/** Characters rejected by Windows or macOS file names, plus control characters. */
const INVALID = /[\\/:*?"<>|\u0000-\u001f]/gu;

/**
 * @param editor - Mounted source owner.
 * @param title - Host document title; empty or absent clears it.
 */
export function setMdDocumentTitle(editor: MsfeEditor, title: string | undefined): void {
  if (title?.trim()) titles.set(editor, title);
  else titles.delete(editor);
}

/**
 * Names a downloaded file after the document: the host title, else the first
 * Markdown heading, else `document`.
 * @param editor - Mounted source owner.
 * @param extension - File extension without the dot.
 * @returns Safe file name.
 */
export function mdExportFileName(editor: MsfeEditor, extension: string): string {
  const heading = /^#{1,6}[ \t]+(.+?)[ \t#]*$/mu.exec(editor.getMarkdown())?.[1];
  const base = [titles.get(editor), heading]
    .map(value => value?.replace(INVALID, " ").replace(/\s+/gu, " ").trim().replace(/^\.+|\.+$/gu, ""))
    .find(value => !!value)?.slice(0, 120) ?? "document";
  return `${base}.${extension}`;
}
