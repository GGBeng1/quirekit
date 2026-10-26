import type { SimpleInstance } from "./types";
import { mindMapRuntimeMessages } from "../runtime/locale";

/** Updates only defaults read at insertion time; vendor updateConfig deep-copies source-bearing options.
 * @param instance - Pinned renderer whose insertion commands read these live fields.
 * @param locale - New UI language, unrelated to source language. */
export function setSimpleMindMapLocale(instance: SimpleInstance, locale: string): void {
  const text = mindMapRuntimeMessages(locale);
  instance.opt.defaultInsertSecondLevelNodeText = text.branch;
  instance.opt.defaultInsertBelowSecondLevelNodeText = text.child;
}
