import type { QuireAiCapability, QuireAiFormatTarget } from "@quirekit/ai-contract";
import { resolveWordParagraphFormatting } from "@quirekit/classic-paragraph-model";
import { resolveWordParagraphStyleRegistry } from "../model/registry";
import { wordParagraphDecorationAiCapabilities } from "./decoration";
import { createWordStyleDefinitionAiCapabilities } from "./definitions";
import type { WordNamedParagraphStyle, WordParagraphStyleRegistry } from "../model/types";

/**
 * Resolves the named style of a paragraph through the document's style registry.
 * @param target - Paragraph read target.
 * @returns Registry and style, or undefined for character targets.
 */
function readStyle(target: QuireAiFormatTarget): { registry: WordParagraphStyleRegistry; styleId: string; style: WordNamedParagraphStyle | undefined } | undefined {
  if (target.level !== "paragraph" || target.node.attrs.wordParagraph === undefined) return undefined;
  const registry = resolveWordParagraphStyleRegistry(target.doc.attrs.wordStyleRegistry);
  const styleId = resolveWordParagraphFormatting(target.node.attrs.wordParagraph).styleId ?? registry.defaultParagraphStyleId;
  return { registry, styleId, style: registry.styles[styleId] };
}

/**
 * Heading level and named style facts resolved through style definitions.
 *
 * Imported documents name heading styles by locale or producer (WPS uses "2",
 * "3"), so the heading level comes from the style definition rather than its id.
 * The style fact shows names, and omits the default style and heading styles,
 * which the heading fact already shows. Paragraph border and shading resolve
 * through the style too, so style-owned lines and fills show and can be changed.
 */
export const wordStylesAiCapabilities: readonly QuireAiCapability[] = [
  {
    kind: "format",
    name: "heading",
    level: "paragraph",
    description: "Heading level 1-9.",
    present: { label: "标题级别", value: value => `标题 ${String(value)}` },
    read: target => readStyle(target)?.style?.headingLevel ?? undefined
  },
  {
    kind: "format",
    name: "style",
    level: "paragraph",
    present: { label: "样式" },
    description: "Paragraph style name other than headings and the default style, such as \"Title\" or \"Quote\"; null returns to the default style.",
    schema: { type: "string", minLength: 1, examples: ["Title", "Quote"] },
    read: target => {
      const resolved = readStyle(target);
      if (resolved === undefined || resolved.styleId === resolved.registry.defaultParagraphStyleId) return undefined;
      // A style id missing from the registry still matters to the model, so it is shown as is.
      if (resolved.style === undefined) return resolved.styleId;
      return resolved.style.headingLevel === null ? resolved.style.name : undefined;
    },
    apply: ({ tr, commands }, value) => {
      const registry = resolveWordParagraphStyleRegistry(tr.doc.attrs.wordStyleRegistry);
      if (value === null) return commands.setWordParagraphProperties({ properties: { styleId: registry.defaultParagraphStyleId } });
      const wanted = String(value).toLowerCase();
      const style = Object.values(registry.styles).find(candidate => candidate.name.toLowerCase() === wanted || candidate.id.toLowerCase() === wanted);
      return style !== undefined && commands.setWordParagraphProperties({ properties: { styleId: style.id } });
    }
  },
  ...wordParagraphDecorationAiCapabilities,
  ...createWordStyleDefinitionAiCapabilities()
];
