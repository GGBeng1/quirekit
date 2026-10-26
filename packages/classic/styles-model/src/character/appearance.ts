import type { QuireNodeCanvasTextStyle } from "@quirekit/core";
import type { WordParagraphStyleRegistry } from "../model/types";
import { resolveWordNamedCharacterStyle } from "../model/character";

/**
 * Keeps Word contents hyperlinks navigable without replacing TOC typography.
 * @param registry - Document style definitions.
 * @param id - Character identity.
 * @param paragraphId - Owning paragraph identity.
 * @param inherited - Effective paragraph and table typography.
 * @returns Effective character text at this occurrence.
 */
export function resolveWordCharacterAppearance(registry: WordParagraphStyleRegistry, id: string, paragraphId: string | null, inherited: QuireNodeCanvasTextStyle): QuireNodeCanvasTextStyle {
  const text = resolveWordNamedCharacterStyle(registry, id, inherited).text;
  const paragraph = registry.styles[paragraphId ?? registry.defaultParagraphStyleId];
  const name = registry.characterStyles?.[id]?.name ?? id;
  if (!/^(?:Hyperlink|超链接)$/iu.test(name) || !/^(?:TOC\s*|目录\s*)[1-9]$/iu.test(paragraph?.name ?? paragraphId ?? "")) return text;
  const result = { ...text };
  delete result.color; delete result.underline; delete result.textDecoration;
  return { ...result, ...(inherited.color === undefined ? {} : { color: inherited.color }),
    ...(inherited.underline === undefined ? {} : { underline: inherited.underline }),
    ...(inherited.textDecoration === undefined ? {} : { textDecoration: inherited.textDecoration }) };
}
