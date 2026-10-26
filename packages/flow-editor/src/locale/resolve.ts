import { controls } from "./en/controls";
import { catalog } from "./en/catalog";
import { content } from "./en/content";
import { errors } from "./en/errors";
import { media } from "./en/media";
import { text } from "./en/text";
import { pages } from "./en/pages";
import { playback } from "./en/playback";
import type { FlowEditorLocale, FlowMessageValues } from "./types";

/** Complete source-keyed catalogue; only feature-owned messages use these keys. */
export const flowEnglishMessages: Readonly<Record<string, string>> = { ...controls, ...catalog, ...content, ...errors, ...media, ...text, ...pages, ...playback };
/** @param locale - Host BCP 47 tag. @returns Supported language with the existing Chinese default. */
export function resolveFlowLocale(locale = "zh-CN"): FlowEditorLocale { return /^en(?:-|$)/i.test(locale) ? "en" : "zh-CN"; }
/** @param locale - Interface language. @param source - Feature-owned message key. @param values - Literal named parameters. @returns Localized message without interpreting user content. */
export function flowEditorText(locale: string, source: string, values: FlowMessageValues = {}): string {
  const message = resolveFlowLocale(locale) === "en" ? flowEnglishMessages[source] ?? source : source;
  return message.replace(/\{(\w+)\}/gu, (match, key: string) => values[key] === undefined ? match : String(values[key]));
}
/** @param locale - Interface language. @param error - Original diagnostic. @returns Current-language feedback, keeping unknown diagnostics available through the host error event. */
export function flowEditorFailure(locale: string, error: unknown): string {
  if (!error) return "";
  const source = error instanceof Error ? error.message : String(error);
  if (resolveFlowLocale(locale) !== "en" || flowEnglishMessages[source] || !/[\p{Script=Han}]/u.test(source)) return flowEditorText(locale, source);
  return flowEditorText(locale, "操作未完成，请重试。");
}
/** @param element - Host-owned editor root or descendant. @returns Language of its closest explicitly localized owner. */
export function readFlowEditorLocale(element: Element): FlowEditorLocale {
  return resolveFlowLocale(element.closest("[lang]")?.getAttribute("lang") ?? "zh-CN");
}
