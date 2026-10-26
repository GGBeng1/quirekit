import { en } from "./en";
import { zhCN } from "./zh-cn";
import type { MindEditorTranslate } from "./types";

/** @param locale - Inherited language tag. @returns Whether the English family was requested. */
export function isMindEditorEnglish(locale: string): boolean { return /^en(?:-|$)/iu.test(locale.trim()); }

/** @param locale - BCP-47 language tag. @returns A pure, instance-independent translator. */
export function mindEditorTranslator(locale = "zh-CN"): MindEditorTranslate {
  const messages = isMindEditorEnglish(locale) ? en : zhCN;
  return (key, values) => messages[key].replace(/\{(\w+)\}/gu, (token, name: string) => String(values?.[name] ?? token));
}
