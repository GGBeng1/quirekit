import { zhCN } from "./zh-cn";
import { en } from "./en";
import { mindEditorTranslator } from "./resolve";
import type { MindEditorMessageKey } from "./types";
import { MindMapRecoveryError } from "../recovery/errors";

const keys = new Map<string, MindEditorMessageKey>();
for (const key of Object.keys(zhCN) as MindEditorMessageKey[]) {
  keys.set(zhCN[key], key); keys.set(en[key], key);
}
/** @param error - Original failure retained for diagnostics. @param locale - Current interface language.
 * @param fallback - Localized action explanation. @returns User-facing explanation with unmodified unknown diagnostic detail. */
export function mindEditorError(error: unknown, locale: string, fallback: MindEditorMessageKey = "unknownError"): string {
  const reason = error instanceof Error ? error.message : String(error), t = mindEditorTranslator(locale);
  if (error instanceof MindMapRecoveryError) return t(error.code);
  const key = keys.get(reason);
  if (key) return t(key);
  if (/link:|URL|protocol/iu.test(reason)) return `${t("invalidLink")}\n${reason}`;
  return `${t(fallback)}\n${reason}`;
}
