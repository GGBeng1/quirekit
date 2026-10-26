import type { QuireAiCapability, QuireAiDocumentSettingCapability, QuireAiDocumentSettingEntry } from "@quirekit/ai-contract";
import { normalizeQuireDocumentFontTheme, quireDefaultDocumentFontTheme, type QuireDocumentFontSet } from "@quirekit/core";

/**
 * Declares the document font theme to the AI manager: the 文档字体 setting line; the
 * `setDocumentFontTheme` command describes itself for setting body and heading fonts per script.
 * Styles that follow the body or heading role inherit these fonts.
 *
 * @returns Document facts.
 */
export function createDocumentAiCapabilities(): readonly QuireAiCapability[] {
  return [
    { kind: "document-setting", name: "document-font", order: 20, read: readFontSettings }
  ];
}

/**
 * @param doc - Document root.
 * @returns The 文档字体 entry.
 */
function readFontSettings(doc: Parameters<QuireAiDocumentSettingCapability["read"]>[0]): QuireAiDocumentSettingEntry[] {
  const theme = normalizeQuireDocumentFontTheme(doc.attrs.fontTheme) ?? quireDefaultDocumentFontTheme;
  return [{ label: "文档字体", value: `正文 ${describeSet(theme.body)}；标题 ${describeSet(theme.heading ?? theme.body)}` }];
}

/** @param set - Role font set. @returns Text such as "中文 宋体、西文 Calibri". */
function describeSet(set: QuireDocumentFontSet): string {
  return `中文 ${set.eastAsia ?? "默认"}、西文 ${set.latin ?? "默认"}`;
}
