import { resolveWordNamedParagraphStyle } from "../model/resolve";
import { resolveWordDocumentStyleRegistry } from "../model/theme/context";
import type { QuireAiCapability, QuireAiDocumentSettingCapability, QuireAiDocumentSettingEntry } from "@quirekit/ai-contract";
import { readWordParagraphAiValue, resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { wordStyleAgentBasePoints, wordStyleAgentParagraphValues } from "../commands/agent";
import type { WordNamedParagraphStyle } from "../model/types";

/** Document root as a setting reader receives it. */
type DocumentNode = Parameters<QuireAiDocumentSettingCapability["read"]>[0];

/**
 * Declares style definitions to the AI manager: one setting line per style in use, with values in
 * the same notation as paragraph and character formats; the style update command describes changing them.
 *
 * @returns Style definition facts.
 */
export function createWordStyleDefinitionAiCapabilities(): readonly QuireAiCapability[] {
  return [
    { kind: "document-setting", name: "paragraph-styles", order: 30, read: readStyleSettings }
  ];
}

/**
 * Lists the default style and every style paragraphs use, in first-use order.
 * @param doc - Document root.
 * @returns One entry per style.
 */
function readStyleSettings(doc: DocumentNode): QuireAiDocumentSettingEntry[] {
  const registry = resolveWordDocumentStyleRegistry(doc.attrs);
  const used = [registry.defaultParagraphStyleId];
  doc.descendants(node => {
    if (node.isTextblock && node.attrs.wordParagraph !== undefined) {
      const id = resolveWordParagraphFormatting(node.attrs.wordParagraph).styleId ?? registry.defaultParagraphStyleId;
      if (!used.includes(id)) used.push(id);
    }
    return !node.isTextblock;
  });
  return used.flatMap(id => {
    const style = registry.styles[id];
    return style === undefined ? [] : [{ label: `样式“${style.name}”`, value: describeStyle({ ...style, text: resolveWordNamedParagraphStyle(registry, id).text }) }];
  });
}

/**
 * @param style - Style definition.
 * @returns Record such as `{fontFamily:"宋体", fontSize:"12pt", align:"justify"}`.
 */
function describeStyle(style: WordNamedParagraphStyle): string {
  const values: [string, unknown][] = [];
  const family = style.text.fontFamily ?? style.text.fontFamilyLatin;
  if (family !== undefined) values.push(["fontFamily", family]);
  if (style.text.fontSize !== undefined) values.push(["fontSize", style.text.fontSize]);
  else if (style.text.fontScale !== undefined) values.push(["fontSize", `${Math.round(style.text.fontScale * wordStyleAgentBasePoints * 10) / 10}pt`]);
  if (style.text.fontWeight !== undefined) values.push(["bold", style.text.fontWeight === "bold"]);
  if (style.text.fontStyle !== undefined) values.push(["italic", style.text.fontStyle === "italic"]);
  const formatting = resolveWordParagraphFormatting(style.paragraph);
  for (const name of wordStyleAgentParagraphValues) {
    const value = readWordParagraphAiValue(formatting, name);
    if (value !== undefined) values.push([name, value]);
  }
  return `{${values.map(([name, value]) => `${name}:${JSON.stringify(value)}`).join(", ")}}`;
}
