import type { zhCN } from "./zh-cn";

/** Keys shared by both complete workspace dictionaries. */
export type MindEditorMessageKey = keyof typeof zhCN;
/** Complete translated workspace dictionary. */
export type MindEditorMessages = { readonly [Key in MindEditorMessageKey]: string };
/** Formats one UI message without interpreting document content as a key. */
export type MindEditorTranslate = (key: MindEditorMessageKey, values?: Readonly<Record<string, string | number>>) => string;
